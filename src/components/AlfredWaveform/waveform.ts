// Keep topology stable while moving the actual vertices, not image opacity.
export const waveformPaths = (seconds: number, lower: boolean) => {
  const phase = (seconds * Math.PI * 2) / 7;
  const breath = (1 - Math.cos(phase)) / 2;
  const start = lower ? 0.12 : Math.PI + 0.12;
  const extent = Math.PI - 0.24;
  const point = (angle: number, radius: number) =>
    `${(34 + Math.cos(angle) * radius).toFixed(3)},${(34 + Math.sin(angle) * radius).toFixed(3)}`;
  const outline: string[] = [];
  const ticks: string[] = [];
  const inner: string[] = [];
  for(let index = 0; index <= 160; index++) {
    const progress = index / 160;
    const angle = start + progress * extent;
    const envelope = 0.7 + 0.3 * Math.sin(progress * Math.PI);
    const wave = (Math.cos(angle * 12 + Math.sin(phase) * 0.18) + 1) / 2;
    const detail = (Math.sin(angle * 23 - Math.sin(phase) * 0.35) + 1) / 2;
    // A retains a visible acoustic band; B grows outward without moving its inner edge.
    const radius = 25.3 + envelope * (0.45 + breath * 4) * (wave * 0.85 + detail * 0.15);
    outline.push(`${index ? 'L' : 'M'}${point(angle, radius)}`);
    inner.unshift(`L${point(angle, 23.9)}`);
    if(index % 3 === 0) {
      ticks.push(`M${point(angle, 24.25)}L${point(angle, radius - 0.3)}`);
    }
  }
  return {
    band: `${outline.join(' ')} ${inner.join(' ')} Z`,
    outline: outline.join(' '),
    ticks: ticks.join(' ')
  };
};
