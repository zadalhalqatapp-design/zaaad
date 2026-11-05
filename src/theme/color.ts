/** أدوات ألوان صغيرة (بلا مكتبات): مزج، توليد تدرّج 50..950، حساب التباين. */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** يمزج `hex` مع `target` بنسبة t (0 = اللون كما هو، 1 = target). */
export function mix(hex: string, target: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(target);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

const LEVELS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/**
 * تدرّج كامل من لون أساسي واحد. `anchor` هو المستوى الذي يساوي اللون المختار نفسه (600 للأساسي
 * لأنه لون الشريط والأزرار، و500 للذهبي). الأفتح بالمزج مع الأبيض والأغمق بالمزج مع الأسود.
 */
export function buildScale(base: string, anchor: 500 | 600): Record<number, string> {
  const white: Record<number, number> = anchor === 600
    ? { 50: 0.92, 100: 0.82, 200: 0.64, 300: 0.44, 400: 0.22, 500: 0.08 }
    : { 50: 0.9, 100: 0.78, 200: 0.58, 300: 0.35, 400: 0.15 };
  const black: Record<number, number> = anchor === 600
    ? { 700: 0.12, 800: 0.24, 900: 0.36, 950: 0.58 }
    : { 600: 0.14, 700: 0.28, 800: 0.42, 900: 0.55, 950: 0.72 };
  const out: Record<number, string> = {};
  for (const level of LEVELS) {
    if (level === anchor) out[level] = base;
    else if (white[level] !== undefined) out[level] = mix(base, '#ffffff', white[level]);
    else out[level] = mix(base, '#000000', black[level]);
  }
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** نسبة التباين WCAG بين لونين (1..21). المقروء للنص العادي ≥ 4.5. */
export function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
