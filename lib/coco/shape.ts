/**
 * The trimmed young coconut, as numbers. Shared by the 3D lathe and the 2D SVG
 * so both previews line up when one cross-fades into the other.
 *
 * Units: 1 unit ≈ 2.7 in (a trimmed coconut is ~5.5 in across).
 */

/** Body profile, bottom rim to top rim, as [radius, y]. Smoothed at use. */
const PROFILE: [number, number][] = [
  [0.55, -1.0],
  [0.8, -0.95],
  [0.95, -0.8],
  [1.02, -0.55],
  [1.03, -0.25],
  [1.0, 0.05],
  [0.9, 0.35],
  [0.72, 0.65],
  [0.52, 0.92],
  [0.4, 1.07],
  [0.36, 1.12],
];

export const BOTTOM_Y = -1.0;
export const TOP_Y = 1.12;
export const TOP_RADIUS = 0.36;
export const UNITS_PER_INCH = 0.37;

/** Where the sticker sits: centre height, on the front (+z). */
export const STICKER_CENTER_Y = -0.3;

/** Camera framing shared by both previews: the box shows this many units tall. */
export const VIEW_HEIGHT = 3.7;
export const VIEW_CENTER_Y = 0.45;
/** Preview box aspect, width / height. */
export const VIEW_ASPECT = 0.8;

/** Catmull-Rom sampled profile: `perSegment` points between each control point. */
export function sampleProfile(perSegment = 5): [number, number][] {
  const p = PROFILE;
  const out: [number, number][] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(i - 1, 0)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(i + 2, p.length - 1)];
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(p[p.length - 1]);
  return out;
}

/** Garnish placement, shared by both previews. */
export const STRAW = { x: 0.17, y: TOP_Y + 0.3, length: 1.1, tilt: -0.3 };
export const HIBISCUS = { x: -0.12, y: TOP_Y + 0.02, z: 0.26 };
export const UMBRELLA = { x: -0.2, y: TOP_Y + 0.3, z: -0.05, tilt: 0.35, stick: 1.1 };
export const LIME = { x: 0.3, y: TOP_Y - 0.02, z: 0.18 };
