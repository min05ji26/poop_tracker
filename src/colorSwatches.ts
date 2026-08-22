import type { PoopColor } from './storage';

export const COLOR_SWATCHES: { label: PoopColor; hex: string | null }[] = [
  { label: '갈색', hex: '#8C5C33' },
  { label: '황토색', hex: '#CC9447' },
  { label: '검정', hex: '#403833' },
  { label: '붉은기', hex: '#BF5247' },
  { label: '녹색', hex: '#739461' },
  { label: '기타', hex: null },
];

const OTHER_COLOR_FALLBACK = '#B8AFA0';

export function getColorHex(color: PoopColor): string {
  return COLOR_SWATCHES.find((swatch) => swatch.label === color)?.hex ?? OTHER_COLOR_FALLBACK;
}
