import Phaser from 'phaser';
export { damageForStrike } from './StrikeDamage';

export type Facing = 'down' | 'up' | 'left' | 'right';
export type EnemyKind = 'wolf' | 'rabbit';

const FORWARD: Record<Facing, Phaser.Math.Vector2> = {
  down: new Phaser.Math.Vector2(0, 1),
  up: new Phaser.Math.Vector2(0, -1),
  left: new Phaser.Math.Vector2(-1, 0),
  right: new Phaser.Math.Vector2(1, 0),
};


export function enemyHealth(kind: EnemyKind): number {
  return kind === 'wolf' ? 65 : 35;
}

export function targetInSwordArc(x: number, y: number, tx: number, ty: number, facing: Facing, range = 64, halfWidth = 37): boolean {
  const deltaX = tx - x;
  const deltaY = ty - y;
  const forward = FORWARD[facing];
  const projection = deltaX * forward.x + deltaY * forward.y;
  const lateral = Math.abs(deltaX * forward.y - deltaY * forward.x);
  return projection > 4 && projection <= range && lateral <= halfWidth;
}

export function lineBlocked(x1: number, y1: number, x2: number, y2: number, obstacles: Phaser.Physics.Arcade.StaticGroup): boolean {
  const line = new Phaser.Geom.Line(x1, y1, x2, y2);
  return obstacles.getChildren().some((object) => {
    const body = (object as Phaser.GameObjects.GameObject & { body?: Phaser.Physics.Arcade.StaticBody }).body;
    if (!body) return false;
    return Phaser.Geom.Intersects.LineToRectangle(line, new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height));
  });
}
