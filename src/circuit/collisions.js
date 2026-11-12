// Collisions du circuit dans Rapier : sol en maillage triangulé, murs en blocs.
// Sans dépendance au rendu.

import { BORD } from './generateur.js';
import { GROUPE } from '../physique/vehicule.js';
import { quatLacet } from '../util/maths.js';

// Point de la section de piste à l'indice i et à l'écart latéral d (positif à droite).
export function pointSection(c, i, d, sortie = [0, 0, 0]) {
  const k = ((i % c.n) + c.n) % c.n;
  sortie[0] = c.x[k] - c.tz[k] * d;
  sortie[1] = c.y[k] - d * Math.tan(c.devers[k]);
  sortie[2] = c.z[k] + c.tx[k] * d;
  return sortie;
}

export const demiLargeurTotale = (c) => c.largeur / 2 + BORD.vibreur + BORD.degagement;

// Colonnes latérales du maillage : des quadrilatères larges sont gauches et
// créent une arête que les roues franchissent comme une marche.
export function colonnes(c) {
  const w = c.largeur / 2;
  const b = demiLargeurTotale(c);
  const col = [-b - 1.5, -b, -w - BORD.vibreur, -w, -w / 2, 0, w / 2, w, w + BORD.vibreur, b, b + 1.5];
  const fin = [];
  for (let i = 0; i < col.length - 1; i++) {
    fin.push(col[i]);
    const n = Math.ceil((col[i + 1] - col[i]) / 3.5);
    for (let k = 1; k < n; k++) fin.push(col[i] + ((col[i + 1] - col[i]) * k) / n);
  }
  fin.push(col[col.length - 1]);
  return fin;
}

// Maillage de la piste : grille le long de la spline, partagée par la collision et le rendu.
export function maillageSol(c) {
  const N = c.n;
  const col = colonnes(c);
  const M = col.length;
  const sommets = new Float32Array(N * M * 3);
  const indices = new Uint32Array(N * (M - 1) * 6);
  const p = [0, 0, 0];
  let k = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      pointSection(c, i, col[j], p);
      sommets.set(p, (i * M + j) * 3);
    }
  }
  for (let i = 0; i < N; i++) {
    const a = i * M;
    const b = ((i + 1) % N) * M;
    for (let j = 0; j < M - 1; j++) {
      indices[k++] = a + j;
      indices[k++] = a + j + 1;
      indices[k++] = b + j;
      indices[k++] = a + j + 1;
      indices[k++] = b + j + 1;
      indices[k++] = b + j;
    }
  }
  return { sommets, indices, colonnes: col };
}

export function creerCollisions(RAPIER, monde, c) {
  const N = c.n;
  const bord = demiLargeurTotale(c);
  const { sommets, indices } = maillageSol(c);
  const groupeSol = (GROUPE.sol << 16) | 0xffff;
  const groupeMur = (GROUPE.mur << 16) | 0xffff;
  monde.createCollider(RAPIER.ColliderDesc.trimesh(sommets, indices).setCollisionGroups(groupeSol).setFriction(0.6));
  // Murs : un bloc tous les trois échantillons, de chaque côté.
  const saut = 3;
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  for (const cote of [-1, 1]) {
    for (let i = 0; i < N; i += saut) {
      pointSection(c, i, cote * (bord + 0.5), a);
      pointSection(c, i + saut, cote * (bord + 0.5), b);
      const dx = b[0] - a[0];
      const dz = b[2] - a[2];
      const demi = Math.hypot(dx, dz) / 2 + 0.3;
      const desc = RAPIER.ColliderDesc.cuboid(0.5, 1.6, demi)
        .setTranslation((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.9, (a[2] + b[2]) / 2)
        .setRotation(quatLacet(Math.atan2(dx, dz)))
        .setCollisionGroups(groupeMur)
        .setFriction(0.3)
        .setRestitution(0.2);
      monde.createCollider(desc);
    }
  }
}

// Position et orientation de départ : sur la piste, à l'abscisse s, à l'écart latéral d.
export function poseDepart(c, s = 0, d = 0, hauteur = 0.34) {
  const i = Math.round(s / c.ds) % c.n;
  const p = pointSection(c, i, d);
  // L'avant de la voiture (-Z local) doit suivre la tangente.
  const lacet = Math.atan2(-c.tx[i], -c.tz[i]);
  return { position: { x: p[0], y: p[1] + hauteur, z: p[2] }, rotation: quatLacet(lacet), indice: i };
}
