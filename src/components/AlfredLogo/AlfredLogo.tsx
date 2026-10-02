import {useEffect, useId, useRef, useState} from 'react';

import {ribbonPath} from './ribbon.js';

const swirl = new URL('../../assets/alfred/swirl.png', import.meta.url).href;
export const AlfredLogo = ({
  active = true,
  className
}: {
  readonly active?: boolean;
  readonly className?: string;
}) => {
  const id = useId().replace(/:/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    if(!window.matchMedia || !window.requestAnimationFrame) {
      return undefined;
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last = 0;
    let elapsed = 0;
    let previous: number | undefined;
    const draw = (phase: number) => {
      svg.current?.querySelectorAll('path').forEach((path) => {
        const ribbon = Number(path.dataset.ribbon);
        const band = Number(path.dataset.band);
        path.setAttribute(
          'd',
          path.dataset.edge
            ? ribbonPath(ribbon, phase, 0, 1, true)
            : ribbonPath(ribbon, phase, band / 40, (band + 1) / 40)
        );
      });
    };
    const tick = (now: number) => {
      try {
        if(previous !== undefined) {
          elapsed += now - previous;
        }
        previous = now;
        if(now - last >= 1000 / 30) {
          draw((elapsed / 7000) * Math.PI * 2);
          last = now;
        }
        frame = requestAnimationFrame(tick);
      } catch{
        setAnimated(false);
      }
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      previous = undefined;
      setAnimated(!media.matches);
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
    <span aria-hidden="true" className={`nx-alfred-logo ${className || ''}`}>
      <img alt="" hidden={animated} src={swirl} />
      <svg
        fill="none"
        focusable="false"
        ref={svg}
        style={{
          display: animated ? 'block' : 'none'
        }}
        viewBox="0 0 160 160"
      >
        <defs>
          <linearGradient id={`${id}-color`} x1="8%" x2="85%" y1="0%" y2="100%">
            <stop stopColor="#27f4f7" />
            <stop offset=".23" stopColor="#0fb4ff" />
            <stop offset=".46" stopColor="#225ced" />
            <stop offset=".7" stopColor="#6844ff" />
            <stop offset="1" stopColor="#d779ff" />
          </linearGradient>
          <linearGradient id={`${id}-edge`} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop stopColor="#aeffff" />
            <stop offset=".4" stopColor="#64bfff" />
            <stop offset=".72" stopColor="#a497ff" />
            <stop offset="1" stopColor="#f3b8ff" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((ribbon) => (
          <g key={ribbon}>
            {Array.from(
              {
                length: 40
              },
              (_, band) => (
                <path
                  d={ribbonPath(ribbon, 0, band / 40, (band + 1) / 40)}
                  data-band={band}
                  data-ribbon={ribbon}
                  fill={`url(#${id}-color)`}
                  fillOpacity={0.13 + 0.77 * Math.pow(Math.abs((2 * (band + 0.5)) / 40 - 1), 2.5)}
                  key={band}
                />
              )
            )}
            <path
              d={ribbonPath(ribbon, 0, 0, 1, true)}
              data-edge="true"
              data-ribbon={ribbon}
              stroke={`url(#${id}-edge)`}
              strokeOpacity=".9"
              strokeWidth=".35"
            />
          </g>
        ))}
      </svg>
    </span>
  );
};
