export const CAMERA_ZOOM = { min: 0.72, max: 1.85, step: 1.12, initial: 1.15, dragThresholdPx: 8 } as const;

export type Point2D = { x: number; y: number };

export type CameraPointerEnd = 'click' | 'drag' | 'ignored';

export class CameraPointerSession {
  private active: { id: number; button: number; touch: boolean; start: Point2D; last: Point2D; dragging: boolean } | null = null;

  begin(id: number, button: number, touch: boolean, position: Point2D, eligibleCanvasTarget: boolean): boolean {
    if (!eligibleCanvasTarget || (button !== 0 && button !== 1 && !touch)) return false;
    this.active = { id, button, touch, start: position, last: position, dragging: false };
    return true;
  }

  move(id: number, position: Point2D): { started: boolean; dragging: boolean; delta: Point2D } | null {
    const active = this.active;
    if (!active || active.id !== id) return null;
    const started = !active.dragging && crossedDragThreshold(active.start, position);
    active.dragging ||= started;
    const delta = active.dragging ? { x: position.x - active.last.x, y: position.y - active.last.y } : { x: 0, y: 0 };
    active.last = position;
    return { started, dragging: active.dragging, delta };
  }

  end(id: number): CameraPointerEnd {
    const active = this.active;
    if (!active || active.id !== id) return 'ignored';
    this.active = null;
    if (active.dragging) return 'drag';
    return active.button === 0 || active.touch ? 'click' : 'ignored';
  }

  cancel(): void { this.active = null; }
}

export function crossedDragThreshold(start: Point2D, current: Point2D, threshold = CAMERA_ZOOM.dragThresholdPx): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold;
}

export function panCameraScroll(scroll: Point2D, screenDelta: Point2D, zoom: number): Point2D {
  return { x: scroll.x - screenDelta.x / zoom, y: scroll.y - screenDelta.y / zoom };
}

export function screenToWorldPoint(screen: Point2D, scroll: Point2D, zoom: number): Point2D {
  return { x: scroll.x + screen.x / zoom, y: scroll.y + screen.y / zoom };
}

export function clampCameraScroll(scroll: Point2D, world: Point2D, viewport: Point2D, zoom: number): Point2D {
  const visibleWidth = viewport.x / zoom;
  const visibleHeight = viewport.y / zoom;
  const clampAxis = (value: number, worldSize: number, visibleSize: number) =>
    worldSize <= visibleSize ? (worldSize - visibleSize) / 2 : Math.max(0, Math.min(worldSize - visibleSize, value));
  return {
    x: clampAxis(scroll.x, world.x, visibleWidth),
    y: clampAxis(scroll.y, world.y, visibleHeight),
  };
}

export function zoomAtPoint(scroll: Point2D, screen: Point2D, oldZoom: number, newZoom: number): Point2D {
  const worldPoint = screenToWorldPoint(screen, scroll, oldZoom);
  return { x: worldPoint.x - screen.x / newZoom, y: worldPoint.y - screen.y / newZoom };
}
