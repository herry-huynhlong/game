import Phaser from 'phaser';
import { enemyHealth, type EnemyKind } from '../systems/CombatSystem';

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly label: Phaser.GameObjects.Text;
  readonly healthBar: Phaser.GameObjects.Graphics;
  readonly homeX: number;
  readonly homeY: number;
  readonly hpMax: number;
  hp: number;
  alive = true;
  nextAttack = 0;
  nextWander = 0;
  stunUntil = 0;
  wanderAngle = 0;
  fleeing = false;

  constructor(private readonly scene: Phaser.Scene, readonly kind: EnemyKind, x: number, y: number, obstacles: Phaser.Physics.Arcade.StaticGroup, readonly spawnId=`beast-${crypto.randomUUID()}`, private readonly onDeath?:(enemy:Enemy)=>void) {
    this.homeX = x; this.homeY = y; this.hpMax = enemyHealth(kind); this.hp = this.hpMax;
    this.sprite = scene.physics.add.sprite(x, y, kind, 0).setOrigin(.5, .82).setDepth(y);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 12).setOffset(6, 15).setCollideWorldBounds(true);
    scene.physics.add.collider(this.sprite, obstacles);
    this.label = scene.add.text(x, y - 35, kind === 'wolf' ? 'Thanh Lang' : 'Linh Thỏ', {
      fontFamily: 'serif', fontSize: '10px', color: kind === 'wolf' ? '#c5d6d0' : '#d9efd8',
      stroke: '#142018', strokeThickness: 3,
    }).setOrigin(.5).setDepth(y + 1);
    this.healthBar = scene.add.graphics().setDepth(y + 2).setVisible(false);
  }

  get body(): Phaser.Physics.Arcade.Body { return this.sprite.body as Phaser.Physics.Arcade.Body; }

  damage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.healthBar.setVisible(true).clear();
    const x = this.sprite.x - 17; const y = this.sprite.y - 43;
    this.healthBar.fillStyle(0x172019, .94).fillRoundedRect(x - 1, y - 1, 36, 6, 2);
    this.healthBar.fillStyle(this.kind === 'wolf' ? 0xc96b5a : 0x83b89a, 1).fillRoundedRect(x, y, 34 * (this.hp / this.hpMax), 4, 1);
    this.sprite.setTint(0xffaaa0);
    this.scene.time.delayedCall(105, () => { if (this.sprite.active && this.alive) this.sprite.clearTint(); });
    if (this.hp <= 0) {
      this.alive = false;
      this.body.setVelocity(0, 0); this.body.enable = false;
      this.label.destroy(); this.healthBar.destroy();
      this.sprite.play(`${this.kind}_death`);
      this.onDeath?.(this);
      return true;
    }
    this.sprite.play(`${this.kind}_hit`, true);
    return false;
  }

  updateUi(): void {
    if (!this.alive) return;
    this.sprite.setDepth(this.sprite.y);
    this.label.setPosition(this.sprite.x, this.sprite.y - 35).setDepth(this.sprite.y + 1);
    if (this.hp < this.hpMax && this.healthBar.visible) {
      this.healthBar.setDepth(this.sprite.y + 2);
      // The bar is repainted with the current fill while the target is damaged.
      this.healthBar.clear();
      const x = this.sprite.x - 17; const y = this.sprite.y - 43;
      this.healthBar.fillStyle(0x172019, .94).fillRoundedRect(x - 1, y - 1, 36, 6, 2);
      this.healthBar.fillStyle(this.kind === 'wolf' ? 0xc96b5a : 0x83b89a, 1).fillRoundedRect(x, y, 34 * (this.hp / this.hpMax), 4, 1);
    }
  }

  dispose(): void { this.label.destroy(); this.healthBar.destroy(); this.sprite.destroy(); }
  suppressSavedDeath():void {this.alive=false;this.body.enable=false;this.sprite.setVisible(false);this.label.destroy();this.healthBar.destroy();}
}
