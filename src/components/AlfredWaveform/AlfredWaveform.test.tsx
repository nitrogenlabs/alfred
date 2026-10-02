import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';

import {AlfredWaveform} from './AlfredWaveform.js';
import {waveformPaths} from './waveform.js';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let callback: FrameRequestCallback;
const media = {
  addEventListener: vi.fn(),
  matches: false,
  removeEventListener: vi.fn()
};

beforeEach(() => {
  media.matches = false;
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((next: FrameRequestCallback) => {
      callback = next;
      return 1;
    })
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

test('moves SVG geometry over time without fading images and stops on exit', async () => {
  await act(async () => root.render(<AlfredWaveform active />));
  const initial = container.querySelector('path')!.getAttribute('d');
  callback(100);
  callback(3600);

  expect(container.querySelector('path')!.getAttribute('d')).not.toBe(initial);
  expect(container.querySelector('img')).toBeNull();

  await act(async () => root.render(<AlfredWaveform active={false} />));

  expect(container.querySelector('path')!.getAttribute('d')).toBe(initial);
  expect(cancelAnimationFrame).toHaveBeenCalled();
});

test('keeps a static ring when reduced motion is requested', async () => {
  media.matches = true;
  await act(async () => root.render(<AlfredWaveform active />));

  expect(requestAnimationFrame).not.toHaveBeenCalled();
  expect(container.querySelectorAll('path')).toHaveLength(6);
});

test('loops seamlessly and keeps both arcs within the button', () => {
  for(const lower of [true, false]) {
    expect(waveformPaths(0, lower)).toEqual(waveformPaths(7, lower));

    for(const seconds of [0, 1.75, 3.5, 5.25]) {
      const coords = waveformPaths(seconds, lower)
        .outline.match(/\d+\.\d+/g)!
        .map(Number);

      expect(Math.min(...coords)).toBeGreaterThan(4);
      expect(Math.max(...coords)).toBeLessThan(64);
    }
  }
});

test('retains visible bars in A and grows their lengths into B', () => {
  const lengths = (seconds: number) =>
    waveformPaths(seconds, false)
      .ticks.split(' ')
      .map((tick) => {
        const [x1, y1, x2, y2] = tick.match(/\d+\.\d+/g)!.map(Number);
        return Math.hypot(x2 - x1, y2 - y1);
      });

  expect(Math.min(...lengths(0))).toBeGreaterThan(0.7);
  expect(Math.max(...lengths(3.5))).toBeGreaterThan(4);
  expect(waveformPaths(0, false).band).toMatch(/Z$/);
});
