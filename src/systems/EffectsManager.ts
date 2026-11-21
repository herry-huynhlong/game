import Phaser from 'phaser';
import type { Facing } from './CombatSystem';

const VECTORS: Record<Facing, { x: number; y: number; angle: number }> = {
  down: { x: 0, y: 1, angle: Math.PI / 2 },
  up: { x: 0, y: -1, angle: -Math.PI / 2 },
  left: { x: -1, y: 0, angle: Math.PI },
  right: { x: 1, y: 0, angle: 0 },
};

export class EffectsManager {
  private audio?: AudioContext;
  constructor(private readonly scene: Phaser.Scene) {}

  slash(x: number, y: number, facing: Facing, combo: number): void {
    const v = VECTORS[facing];
    const effect = this.scene.add.sprite(x + v.x * 19, y - 22 + v.y * 11, 'slash-arc')
      .setRotation(v.angle - Math.PI / 4).setScale(combo === 3 ? 1.2 : 1).setDepth(y + 25).play('fx_slash');
    effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => effect.destroy());
    this.sound(combo === 3 ? 610 : 470, 0.11, 'sawtooth');
  }

  impact(x: number, y: number, damage: number, color = '#fff1b7'): void {
    const spark = this.scene.add.sprite(x, y - 15, 'impact-spark').setDepth(y + 12).play('fx_impact');
    spark.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spark.destroy());
    const text = this.scene.add.text(x, y - 35, String(damage), {
      fontFamily: 'monospace', fontSize: '13px', color, stroke: '#102018', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(y + 30);
    this.scene.tweens.add({ targets: text, y: text.y - 26, alpha: 0, duration: 620, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
    this.sound(770, 0.075, 'square');
  }

  burst(x: number, y: number): void {
    const burst = this.scene.add.sprite(x, y - 12, 'spirit-burst').setDepth(y + 18).play('fx_burst');
    burst.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => burst.destroy());
  }

  private sound(frequency: number, duration: number, type: OscillatorType): void {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') void this.audio.resume();
      const oscillator = this.audio.createOscillator();
      const gain = this.audio.createGain();
      oscillator.type = type; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.055, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + duration);
      oscillator.connect(gain); gain.connect(this.audio.destination);
      oscillator.start(); oscillator.stop(this.audio.currentTime + duration);
    } catch { /* Audio can be unavailable in a muted or restricted browser. */ }
  }
}
