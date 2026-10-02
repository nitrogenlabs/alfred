import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';

import {AlfredLogo} from './AlfredLogo.js';
import {ribbonPath} from './ribbon.js';

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

test('morphs the ribbons and cancels animation when inactive', async () => {
  await act(async () => root.render(<AlfredLogo />));
  const initial = container.querySelector('path')!.getAttribute('d');
  callback(100);
  callback(3600);

  expect(container.querySelector('path')!.getAttribute('d')).not.toBe(initial);
  expect(container.querySelector('img')!.hidden).toBe(true);

  await act(async () => root.render(<AlfredLogo active={false} />));

  expect(cancelAnimationFrame).toHaveBeenCalled();
});

test('uses the original still for reduced motion and unavailable animation APIs', async () => {
  media.matches = true;
  await act(async () => root.render(<AlfredLogo />));

  expect(requestAnimationFrame).not.toHaveBeenCalled();
  expect(container.querySelector('img')!.hidden).toBe(false);

  await act(async () => root.unmount());
  root = createRoot(container);
  vi.stubGlobal('matchMedia', undefined);
  await act(async () => root.render(<AlfredLogo />));

  expect(container.querySelector('img')!.hidden).toBe(false);
});

test('keeps gradients unique between the launcher and header', async () => {
  await act(async () =>
    root.render(
      <>
        <AlfredLogo />
        <AlfredLogo />
      </>
    )
  );
  const ids = [...container.querySelectorAll('linearGradient')].map((node) => node.id);

  expect(new Set(ids).size).toBe(4);
});

test('falls back to the still if drawing fails', async () => {
  await act(async () => root.render(<AlfredLogo />));
  vi.spyOn(container.querySelector('path')!, 'setAttribute').mockImplementation(() => {
    throw new Error('SVG unavailable');
  });
  await act(async () => callback(100));

  expect(container.querySelector('img')!.hidden).toBe(false);
});

test('keeps the opening clear and all geometry inside the viewport across the flow', () => {
  for(const ribbon of [0, 1, 2]) {
    for(const phase of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 12]) {
      const coords = ribbonPath(ribbon, phase)
        .match(/\d+\.\d+/g)!
        .map(Number);

      expect(Math.min(...coords)).toBeGreaterThan(5);
      expect(Math.max(...coords)).toBeLessThan(155);
      expect(ribbonPath(ribbon, phase, 0, 1, true)).not.toMatch(/Z$/);
    }
  }
});
