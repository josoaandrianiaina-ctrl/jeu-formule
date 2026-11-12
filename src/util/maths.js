// Outils mathématiques sans dépendance, utilisables sous Node comme dans le navigateur.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norme = (a) => Math.hypot(a[0], a[1], a[2]);
export const unite = (a) => {
  const n = norme(a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};

// Rotation du vecteur v par le quaternion q {x, y, z, w}.
export function tourner(q, v) {
  const u = [q.x, q.y, q.z];
  const c1 = cross(u, v);
  const c2 = cross(u, c1);
  return [
    v[0] + 2 * (q.w * c1[0] + c2[0]),
    v[1] + 2 * (q.w * c1[1] + c2[1]),
    v[2] + 2 * (q.w * c1[2] + c2[2]),
  ];
}

// Quaternion d'une rotation d'angle a autour de l'axe Y.
export const quatLacet = (a) => ({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) });

// Générateur pseudo-aléatoire déterministe.
export function mulberry32(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatTemps(s) {
  if (!isFinite(s) || s <= 0) return '-:--.---';
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(3)}`;
}
