// Profil de vitesse le long du centre de piste : vitesse tenable en virage,
// puis freinage et accélération possibles. Sert à la trajectoire colorée et au pilote automatique.

import { G, VOITURE } from '../config.js';
import { clamp } from '../util/maths.js';

export function profilVitesse(c, P = VOITURE, marge = 0.85) {
  const N = c.n;
  const kA = (0.5 * P.rho * P.CzA) / P.masse;
  const kT = (0.5 * P.rho * P.CxA) / P.masse;
  const vMax = 88;
  const mu = (v) => P.mu0 * clamp(1 - (P.kMu * kA * v * v) / G, 0.6, 1.15) * marge;
  const aMax = (v) => mu(v) * (G + kA * v * v);
  const v = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const k = Math.abs(c.courbure[i]);
    let x = 40;
    if (k < 1e-5) x = vMax;
    else for (let it = 0; it < 12; it++) x = Math.min(vMax, Math.sqrt(aMax(x) / k));
    v[i] = x;
  }
  // Passe arrière : freinage. Passe avant : accélération. Deux tours pour boucler.
  for (let tour = 0; tour < 2; tour++) {
    for (let i = N - 1; i >= 0; i--) {
      const j = (i + 1) % N;
      const lat = v[j] * v[j] * Math.abs(c.courbure[j]);
      const dispo = Math.sqrt(Math.max(aMax(v[j]) ** 2 - lat * lat, 0)) * 0.9;
      const a = dispo + kT * v[j] * v[j] + G * c.pente[i];
      v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * Math.max(a, 1) * c.ds));
    }
    for (let i = 0; i < N; i++) {
      const j = (i + N - 1) % N;
      const vv = Math.max(v[j], 5);
      const lat = vv * vv * Math.abs(c.courbure[j]);
      const adher = Math.sqrt(Math.max(aMax(vv) ** 2 - lat * lat, 0)) * (1 - P.repAvant);
      const a = Math.min(adher, (P.puissance * P.rendement) / (P.masse * vv)) - kT * vv * vv - G * c.pente[j];
      v[i] = Math.min(v[i], Math.sqrt(Math.max(v[j] * v[j] + 2 * a * c.ds, 25)));
    }
  }
  // Décélération demandée en chaque point (m/s²), nulle hors des zones de freinage.
  const freinage = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    freinage[i] = Math.max((v[i] * v[i] - v[j] * v[j]) / (2 * c.ds), 0);
  }
  return { vitesse: v, freinage };
}
