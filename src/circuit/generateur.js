// Générateur déterministe de circuits fermés (docs/ARCHITECTURE.md, section 3.3).
// Aucune dépendance au rendu : utilisable dans les tests sous Node.

import { clamp, mulberry32 } from '../util/maths.js';

export const STYLES = {
  'foret-noire': {
    nom: 'Forêt-Noire',
    graine: 11,
    nbPoints: 16,
    rayon: 520,
    variation: 0.36,
    gigue: 0.22,
    denivele: 38,
    largeur: 14,
  },
  valmora: {
    nom: 'Valmora',
    graine: 5,
    nbPoints: 11,
    rayon: 600,
    variation: 0.26,
    gigue: 0.16,
    denivele: 12,
    largeur: 15,
  },
};

export const BORD = { vibreur: 1.2, degagement: 16 };
export const LIMITES = { rayonMin: 45, penteMax: 0.09, separation: 62, longMin: 2600, longMax: 4800 };

// B-spline cubique uniforme et périodique : continue en position, tangente et courbure.
function bspline(P, j, u) {
  const n = P.length;
  const a = P[(j - 1 + n) % n];
  const b = P[j % n];
  const c = P[(j + 1) % n];
  const d = P[(j + 2) % n];
  const u2 = u * u;
  const u3 = u2 * u;
  const b0 = ((1 - u) ** 3) / 6;
  const b1 = (3 * u3 - 6 * u2 + 4) / 6;
  const b2 = (-3 * u3 + 3 * u2 + 3 * u + 1) / 6;
  const b3 = u3 / 6;
  const e0 = -((1 - u) ** 2) / 2;
  const e1 = (3 * u2 - 4 * u) / 2;
  const e2 = (-3 * u2 + 2 * u + 1) / 2;
  const e3 = u2 / 2;
  const f0 = 1 - u;
  const f1 = 3 * u - 2;
  const f2 = -3 * u + 1;
  const f3 = u;
  const r = { p: [0, 0, 0], d1: [0, 0, 0], d2: [0, 0, 0] };
  for (let k = 0; k < 3; k++) {
    r.p[k] = b0 * a[k] + b1 * b[k] + b2 * c[k] + b3 * d[k];
    r.d1[k] = e0 * a[k] + e1 * b[k] + e2 * c[k] + e3 * d[k];
    r.d2[k] = f0 * a[k] + f1 * b[k] + f2 * c[k] + f3 * d[k];
  }
  return r;
}

function pointsDeControle(o, rng) {
  const n = o.nbPoints;
  const phases = [rng() * 6.283, rng() * 6.283, rng() * 6.283];
  const amp = [0.5, 0.3, 0.2].map((k) => (k * o.denivele) / 2);
  const P = [];
  for (let i = 0; i < n; i++) {
    const pas = (2 * Math.PI) / n;
    // Sens horaire vu du dessus : les angles décroissent.
    const ang = -(i * pas + (rng() * 2 - 1) * o.gigue * pas);
    const r = o.rayon * (1 + (rng() * 2 - 1) * o.variation);
    const y =
      amp[0] * Math.sin(ang + phases[0]) +
      amp[1] * Math.sin(2 * ang + phases[1]) +
      amp[2] * Math.sin(3 * ang + phases[2]);
    P.push([r * Math.cos(ang), y, r * Math.sin(ang)]);
  }
  return P;
}

function echantillonner(P, pas) {
  const n = P.length;
  const M = 64;
  const table = [0];
  let prec = bspline(P, 0, 0).p;
  for (let k = 1; k <= n * M; k++) {
    const j = Math.floor(k / M) % n;
    const u = (k % M) / M;
    const p = bspline(P, j, u).p;
    table.push(table[k - 1] + Math.hypot(p[0] - prec[0], p[1] - prec[1], p[2] - prec[2]));
    prec = p;
  }
  const longueur = table[n * M];
  const N = Math.round(longueur / pas);
  const ds = longueur / N;
  const c = {
    n: N,
    ds,
    longueur,
    x: new Float32Array(N),
    y: new Float32Array(N),
    z: new Float32Array(N),
    tx: new Float32Array(N),
    tz: new Float32Array(N),
    courbure: new Float32Array(N),
    pente: new Float32Array(N),
  };
  let k = 0;
  for (let i = 0; i < N; i++) {
    const cible = i * ds;
    while (k < n * M - 1 && table[k + 1] < cible) k++;
    const f = (cible - table[k]) / Math.max(table[k + 1] - table[k], 1e-9);
    const t = (k + f) / M;
    const j = Math.floor(t) % n;
    const s = bspline(P, j, t - Math.floor(t));
    const h = Math.hypot(s.d1[0], s.d1[2]);
    c.x[i] = s.p[0];
    c.y[i] = s.p[1];
    c.z[i] = s.p[2];
    c.tx[i] = s.d1[0] / h;
    c.tz[i] = s.d1[2] / h;
    // Courbure en plan, positive pour un virage à droite.
    c.courbure[i] = (s.d1[0] * s.d2[2] - s.d1[2] * s.d2[0]) / (h * h * h);
    c.pente[i] = s.d1[1] / h;
  }
  return c;
}

// Contrôles de validité. Retourne la liste des défauts (vide si le circuit est valide).
export function controler(c, largeur) {
  const defauts = [];
  const N = c.n;
  let kMax = 0;
  let pMax = 0;
  for (let i = 0; i < N; i++) {
    kMax = Math.max(kMax, Math.abs(c.courbure[i]));
    pMax = Math.max(pMax, Math.abs(c.pente[i]));
  }
  if (kMax > 1 / LIMITES.rayonMin) defauts.push(`rayon minimal ${(1 / kMax).toFixed(0)} m`);
  if (pMax > LIMITES.penteMax) defauts.push(`pente maximale ${(pMax * 100).toFixed(1)} %`);
  if (c.longueur < LIMITES.longMin || c.longueur > LIMITES.longMax)
    defauts.push(`longueur ${c.longueur.toFixed(0)} m`);
  // Continuité à la jonction : le saut entre le dernier et le premier point
  // doit ressembler au saut entre deux points voisins quelconques.
  const saut = (a, b) => ({
    pos: Math.hypot(c.x[a] - c.x[b], c.y[a] - c.y[b], c.z[a] - c.z[b]),
    tan: Math.hypot(c.tx[a] - c.tx[b], c.tz[a] - c.tz[b]),
    cou: Math.abs(c.courbure[a] - c.courbure[b]),
    pen: Math.abs(c.pente[a] - c.pente[b]),
  });
  let ref = { pos: 0, tan: 0, cou: 0, pen: 0 };
  for (let i = 0; i < N - 1; i++) {
    const s = saut(i, i + 1);
    for (const k in ref) ref[k] = Math.max(ref[k], s[k]);
  }
  const j = saut(N - 1, 0);
  for (const k in ref) if (j[k] > ref[k] * 1.5 + 1e-6) defauts.push(`discontinuité ${k} à la jonction`);
  // Aucune portion de piste ne passe trop près d'une autre.
  const ecartIdx = Math.ceil(140 / c.ds);
  const sep = Math.max(LIMITES.separation, largeur + 2 * (BORD.vibreur + BORD.degagement) + 8);
  let croise = false;
  for (let a = 0; a < N && !croise; a += 3) {
    for (let b = a + ecartIdx; b < N; b += 3) {
      if (N - (b - a) < ecartIdx) continue;
      if (Math.hypot(c.x[a] - c.x[b], c.z[a] - c.z[b]) < sep) {
        croise = true;
        break;
      }
    }
  }
  if (croise) defauts.push('portions de piste trop proches');
  return defauts;
}

function decaler(c, depart) {
  const N = c.n;
  for (const cle of ['x', 'y', 'z', 'tx', 'tz', 'courbure', 'pente']) {
    const src = c[cle];
    const dst = new Float32Array(N);
    for (let i = 0; i < N; i++) dst[i] = src[(i + depart) % N];
    c[cle] = dst;
  }
}

// Portion la plus droite du circuit : fenêtre de longueur donnée où la courbure maximale est la plus faible.
function fenetreDroite(c, longueur, eviter = null) {
  const N = c.n;
  const w = Math.round(longueur / c.ds);
  let best = 0;
  let bestVal = Infinity;
  for (let i = 0; i < N; i += 4) {
    if (eviter && eviter(i)) continue;
    let m = 0;
    for (let k = 0; k < w; k += 2) m = Math.max(m, Math.abs(c.courbure[(i + k) % N]));
    if (m < bestVal) {
      bestVal = m;
      best = i;
    }
  }
  return { debut: best, fin: best + w, courbure: bestVal };
}

export function genererCircuit(options = {}) {
  const o = { ...STYLES['foret-noire'], pas: 2, ...options };
  for (let essai = 0; essai < 80; essai++) {
    const rng = mulberry32(o.graine + essai * 7919);
    const P = pointsDeControle(o, rng);
    const c = echantillonner(P, o.pas);
    const defauts = controler(c, o.largeur);
    if (defauts.length) continue;
    // Départ au milieu de la portion la plus droite.
    const droite = fenetreDroite(c, 420);
    decaler(c, (droite.debut + Math.round(150 / c.ds)) % c.n);
    c.nom = o.nom;
    c.graine = o.graine;
    c.essai = essai;
    c.largeur = o.largeur;
    c.devers = new Float32Array(c.n);
    for (let i = 0; i < c.n; i++) c.devers[i] = clamp(c.courbure[i] * 7, -0.07, 0.07);
    c.secteurs = [c.longueur / 3, (2 * c.longueur) / 3];
    // Zones DRS : la ligne droite du départ et la deuxième portion la plus droite.
    const z1 = { debut: c.n - Math.round(120 / c.ds), fin: c.n + Math.round(250 / c.ds) };
    const marge = Math.round(700 / c.ds);
    const d2 = fenetreDroite(c, 380, (i) => i < marge || i > c.n - marge);
    c.zonesDrs = [
      { debut: (z1.debut % c.n) * c.ds, fin: (z1.fin % c.n) * c.ds },
      { debut: (d2.debut % c.n) * c.ds, fin: (d2.fin % c.n) * c.ds },
    ];
    c.controle = P;
    return c;
  }
  throw new Error(`Aucun circuit valide pour la graine ${o.graine}`);
}

// Position d'un point (x, z) par rapport au circuit : indice, abscisse s, écart latéral d (positif à droite).
export function localiser(c, x, z, indice = -1) {
  const N = c.n;
  let best = 0;
  let bestD = Infinity;
  if (indice < 0) {
    for (let i = 0; i < N; i += 2) {
      const d = (c.x[i] - x) ** 2 + (c.z[i] - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  } else {
    for (let k = -12; k <= 24; k++) {
      const i = (indice + k + N) % N;
      const d = (c.x[i] - x) ** 2 + (c.z[i] - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  }
  const dx = x - c.x[best];
  const dz = z - c.z[best];
  const le = dx * c.tx[best] + dz * c.tz[best];
  let s = best * c.ds + le;
  if (s < 0) s += c.longueur;
  if (s >= c.longueur) s -= c.longueur;
  return { i: best, s, d: -dx * c.tz[best] + dz * c.tx[best] };
}

export function dansZoneDrs(c, s) {
  return c.zonesDrs.some((z) => (z.debut <= z.fin ? s >= z.debut && s <= z.fin : s >= z.debut || s <= z.fin));
}

// Nature du sol à un écart latéral donné.
export function surface(c, d) {
  const a = Math.abs(d);
  if (a <= c.largeur / 2) return 'piste';
  if (a <= c.largeur / 2 + BORD.vibreur) return 'vibreur';
  return 'herbe';
}
