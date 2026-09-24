import { describe, expect, test } from 'vitest';
import { dragViewport, fitViewport, zoomViewport } from '../src/viewport';

describe('viewport', () => {
  test('zooms around the pointer position', () => {
    const next = zoomViewport({ scale: 1, x: 0, y: 0 }, 2, { x: 100, y: 80 });
    expect(next).toEqual({ scale: 2, x: -100, y: -80 });
  });

  test('clamps zoom scale', () => {
    expect(zoomViewport({ scale: 1, x: 0, y: 0 }, 100, { x: 0, y: 0 }).scale).toBe(4);
    expect(zoomViewport({ scale: 1, x: 0, y: 0 }, 0.01, { x: 0, y: 0 }).scale).toBe(0.25);
  });

  test('drags by pointer delta', () => {
    expect(dragViewport({ scale: 1.5, x: 10, y: -6 }, 12, -8)).toEqual({ scale: 1.5, x: 22, y: -14 });
  });

  test('fits oversized content into the viewport', () => {
    expect(fitViewport({ width: 1000, height: 600 }, { width: 500, height: 300 })).toEqual({ scale: 0.5, x: 0, y: 0 });
  });
});
