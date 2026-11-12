// Modèle de pneu : docs/PHYSIQUE.md, sections 4.3 et 4.4.

import { G, VOITURE } from '../config.js';
import { clamp } from '../util/maths.js';

// Courbe d'adhérence normalisée : croissante, maximum 1 en s = 1, puis légère chute.
export const courbe = (s) => Math.sin(1.5 * Math.atan(1.7320508 * s));

// Adhérence disponible selon la charge normale.
export function adherence(Fz, P = VOITURE) {
  const Fz0 = (P.masse * G) / 4;
  return P.mu0 * clamp(1 - (P.kMu * (Fz - Fz0)) / Fz0, 0.6, 1.15);
}

// Forces longitudinale et latérale d'un pneu, avec saturation combinée.
// kappa : glissement longitudinal ; tanAlpha : tangente de l'angle de dérive.
export function forcesPneu(kappa, tanAlpha, Fz, mu, P = VOITURE, sortie = [0, 0]) {
  const sx = kappa / P.kappaPic;
  const sy = tanAlpha / Math.tan(P.alphaPic);
  const s = Math.hypot(sx, sy);
  if (s < 1e-9 || Fz <= 0) {
    sortie[0] = 0;
    sortie[1] = 0;
    return sortie;
  }
  const F = mu * Fz * courbe(s);
  sortie[0] = (F * sx) / s;
  sortie[1] = (-F * sy) / s;
  return sortie;
}
