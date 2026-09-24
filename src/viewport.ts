export interface ViewportState {
  scale: number;
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

function clamp(value: number, min = MIN_SCALE, max = MAX_SCALE): number {
  return Math.max(min, Math.min(max, value));
}

export function zoomViewport(state: ViewportState, factor: number, origin: Point): ViewportState {
  const scale = clamp(state.scale * factor);
  const ratio = scale / state.scale;
  return {
    scale,
    x: origin.x - (origin.x - state.x) * ratio,
    y: origin.y - (origin.y - state.y) * ratio,
  };
}

export function dragViewport(state: ViewportState, dx: number, dy: number): ViewportState {
  return { ...state, x: state.x + dx, y: state.y + dy };
}

export function fitViewport(content: Size, viewport: Size): ViewportState {
  if (!content.width || !content.height || !viewport.width || !viewport.height) return { scale: 1, x: 0, y: 0 };
  const scale = clamp(Math.min(viewport.width / content.width, viewport.height / content.height, 1));
  return {
    scale,
    x: (viewport.width - content.width * scale) / 2,
    y: (viewport.height - content.height * scale) / 2,
  };
}
