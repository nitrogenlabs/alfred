import {useEffect, useRef} from 'react';

import {waveformPaths} from './waveform.js';

export const AlfredWaveform = ({active}: {readonly active: boolean}) => {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let start: number | undefined;
    const draw = (seconds: number) => {
      [false, true].forEach((lower, index) => {
        const paths = waveformPaths(seconds, lower);
        svg.current?.querySelector(`[data-band="${index}"]`)?.setAttribute('d', paths.band);
        svg.current?.querySelector(`[data-outline="${index}"]`)?.setAttribute('d', paths.outline);
        svg.current?.querySelector(`[data-ticks="${index}"]`)?.setAttribute('d', paths.ticks);
      });
    };
    const tick = (now: number) => {
      start ??= now;
      draw((now - start) / 1000);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      start = undefined;
      draw(0);
      if(active && !media.matches && !document.hidden) {
        frame = requestAnimationFrame(tick);
      }
    };
    sync();
    media.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [active]);
  return (
    <svg
      aria-hidden="true"
      className="nx-alfred-wave"
      fill="none"
      focusable="false"
      ref={svg}
      viewBox="0 0 68 68"
    >
      {[false, true].map((lower, index) => {
        const paths = waveformPaths(0, lower);
        return (
          <g key={index} stroke={lower ? '#c84df2' : '#28d4f5'} strokeLinecap="round" strokeLinejoin="round">
            <path
              d={paths.band}
              data-band={index}
              fill={lower ? '#b339ed' : '#09c5ee'}
              fillOpacity="0.5"
              stroke="none"
            />
            <path d={paths.outline} data-outline={index} strokeWidth="0.65" />
            <path
              d={paths.ticks}
              data-ticks={index}
              opacity="0.95"
              stroke={lower ? '#f1c9ff' : '#d4faff'}
              strokeWidth="0.45"
            />
          </g>
        );
      })}
    </svg>
  );
};
