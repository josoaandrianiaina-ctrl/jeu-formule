// Pilote automatique simple : suit le centre de piste et le profil de vitesse.
// Utilisé par les tests ; base des futurs adversaires.

import { G, VOITURE } from '../config.js';
import { clamp, tourner } from '../util/maths.js';
import { localiser } from '../circuit/generateur.js';

export class Pilote {
  constructor(circuit, profil, options = {}) {
    this.c = circuit;
    this.profil = profil;
    this.rythme = options.rythme ?? 0.92;
    this.indice = -1;
  }

  commande(vehicule) {
    const c = this.c;
    const P = vehicule.P || VOITURE;
    const t = vehicule.corps.translation();
    const q = vehicule.corps.rotation();
    const avant = tourner(q, [0, 0, -1]);
    const v = vehicule.tel.vitesse;
    const loc = localiser(c, t.x, t.z, this.indice);
    this.indice = loc.i;
    // Point visé devant la voiture.
    const dist = clamp(7 + 0.22 * v, 8, 30);
    const k = (loc.i + Math.round(dist / c.ds)) % c.n;
    const dx = c.x[k] - t.x;
    const dz = c.z[k] - t.z;
    const d = Math.hypot(dx, dz) || 1;
    // Angle entre l'avant de la voiture et le point visé, positif vers la droite.
    const lat = (dx * -avant[2] + dz * avant[0]) / d;
    const lon = (dx * avant[0] + dz * avant[2]) / d;
    const eta = Math.atan2(lat, lon);
    const braq = Math.atan((2 * P.empattement * Math.sin(eta)) / d);
    const aLat = 0.8 * P.mu0 * G + ((0.5 * P.rho * P.CzA) / P.masse) * v * v;
    const braqMax = clamp((1.7 * P.empattement * aLat) / Math.max(v * v, 36), 0.02, P.braquageMax);
    const volant = clamp(braq / braqMax, -1, 1);
    // Vitesse cible un peu en avant, pour anticiper.
    const kv = (loc.i + Math.round((2 + 0.05 * v) / c.ds)) % c.n;
    const cible = this.profil.vitesse[kv] * this.rythme;
    let gaz = 0;
    let frein = 0;
    if (v > cible + 0.5) frein = clamp((v - cible) / 4, 0.15, 1);
    else gaz = clamp((cible - v) / 3, 0.2, 1);
    return { gaz, frein, volant, drs: false, loc };
  }
}
