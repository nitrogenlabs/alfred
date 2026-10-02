export const ribbonPath = (ribbon: number, phase: number, inner = 0, outer = 1, edge = false): string => {
  const rotation = (ribbon * Math.PI * 2) / 3;
  const breath = Math.sin(phase + rotation * 0.45);
  // A slower, shared current with staggered responses keeps the ribbons flowing together.
  const current = phase * 0.35;
  const drift = current + rotation;
  const tilt = rotation + 0.35 + 0.1 * Math.sin(drift);
  const innerX = 35 * (1 + 0.06 * breath);
  const innerY = 27 * (1 + 0.06 * breath);
  const outerX = 63 * (1 + 0.045 * breath);
  const outerY = 48;
  const centerX = 80 + 5 * Math.cos(rotation) + 2.4 * Math.sin(drift);
  const centerY = 80 + 5 * Math.sin(rotation) + 3.2 * Math.cos(drift);
  const points: string[] = [];
  for(const [side, position] of [
    [1, outer],
    [-1, inner]
  ]) {
    const horizontalRadius = innerX + (outerX - innerX) * position;
    const verticalRadius = innerY + (outerY - innerY) * position;
    for(let step = 0; step <= 80; step++) {
      const t = ((side === 1 ? step : 80 - step) / 80) * Math.PI * 2;
      const x = Math.cos(t) * horizontalRadius;
      const y = Math.sin(t) * verticalRadius;
      points.push(
        `${!points.length || (edge && step === 0) ? 'M' : 'L'}${(centerX + x * Math.cos(tilt) - y * Math.sin(tilt)).toFixed(3)},${(centerY + x * Math.sin(tilt) + y * Math.cos(tilt)).toFixed(3)}`
      );
    }
  }
  return points.join(' ') + (edge ? '' : ' Z');
};
