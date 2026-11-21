import Phaser from 'phaser';

export class CultivationEffects {
  private pose?: Phaser.GameObjects.Image;
  private circle?: Phaser.GameObjects.Image;
  private aura?: Phaser.GameObjects.Sprite;

  constructor(private readonly scene: Phaser.Scene) {}

  beginMeditation(player: Phaser.Physics.Arcade.Sprite): void {
    if (this.pose) return;
    player.setVisible(false);
    this.circle = this.scene.add.image(player.x, player.y - 5, 'cultivation-circle').setOrigin(.5, .5).setDepth(player.y - 2).setAlpha(.86);
    this.pose = this.scene.add.image(player.x, player.y, 'meditation-pose').setOrigin(.5, 1).setDepth(player.y + 1);
    this.aura = this.scene.add.sprite(player.x, player.y - 30, 'spirit-aura').setOrigin(.5).setScale(1.3).setAlpha(.86).setDepth(player.y + 2).play('cultivation-aura');
    this.scene.tweens.add({ targets: this.aura, angle: 360, alpha: { from: .56, to: .94 }, duration: 3600, repeat: -1, yoyo: true });
  }

  updateMeditation(player: Phaser.Physics.Arcade.Sprite): void {
    this.pose?.setPosition(player.x, player.y).setDepth(player.y + 1);
    this.circle?.setPosition(player.x, player.y - 5).setDepth(player.y - 2);
    this.aura?.setPosition(player.x, player.y - 30).setDepth(player.y + 2);
  }

  endMeditation(player: Phaser.Physics.Arcade.Sprite): void {
    player.setVisible(true);
    this.pose?.destroy(); this.circle?.destroy(); this.aura?.destroy();
    this.pose = undefined; this.circle = undefined; this.aura = undefined;
  }

  absorbPulse(x: number, y: number): void {
    const motes = this.scene.add.particles(x, y - 25, 'spirit-burst', {
      frame: [0, 1, 2, 3, 4, 5, 6, 7],
      lifespan: 320,
      speed: { min: 16, max: 42 },
      angle: { min: 210, max: 330 },
      scale: { start: .36, end: .05 },
      alpha: { start: .9, end: 0 },
      quantity: 5,
      emitting: false,
    }).setDepth(y + 3);
    motes.explode(5, x, y - 25);
    this.scene.time.delayedCall(400, () => motes.destroy());
  }

  breakthrough(x: number, y: number, foundation: boolean): void {
    const texture = foundation ? 'foundation-breakthrough' : 'realm-ascension';
    const effect = this.scene.add.sprite(x, y - (foundation ? 28 : 20), texture).setDepth(y + 40).setBlendMode(Phaser.BlendModes.ADD).play(foundation ? 'foundation-breakthrough' : 'realm-ascension');
    effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => effect.destroy());
    this.scene.cameras.main.flash(foundation ? 360 : 190, 173, 240, 217, false);
    if (foundation) this.scene.cameras.main.shake(240, .003);
  }
}
