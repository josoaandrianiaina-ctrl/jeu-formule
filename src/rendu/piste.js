// Décor du circuit : piste, vibreurs, dégagements, relief, barrières, arbres.
// La géométrie du sol reprend la grille de collision, pour que l'image
// corresponde exactement à ce que la physique touche.

import * as THREE from 'three';
import { BORD } from '../circuit/generateur.js';
import { colonnes, demiLargeurTotale, pointSection } from '../circuit/collisions.js';
import { mulberry32 } from '../util/maths.js';

const COUL = {
  asphalte: new THREE.Color(0x3b3d42),
  asphalteUse: new THREE.Color(0x4a4d53),
  ligne: new THREE.Color(0xe8e8e4),
  vibreurA: new THREE.Color(0xc8352c),
  vibreurB: new THREE.Color(0xeceae4),
  degagement: new THREE.Color(0x6e6450),
  herbe: new THREE.Color(0x4a6136),
  herbeLoin: new THREE.Color(0x3e5530),
};

const LARGEUR_DECOR = 230;

function colonnesDecor(c) {
  const col = colonnes(c).slice();
  const b = demiLargeurTotale(c) + 1.5;
  for (const d of [8, 20, 38, 62, 95, 145, LARGEUR_DECOR]) {
    col.unshift(-b - d);
    col.push(b + d);
  }
  return col;
}

// Au-delà du rayon du virage, les sections décalées se replient et laissent un trou.
// L'écart est donc borné par le rayon local, du côté intérieur.
function ecartSur(c, i, d) {
  const k = c.courbure[i];
  if (d === 0 || Math.sign(d) !== Math.sign(k) || Math.abs(k) < 1e-6) return d;
  const limite = 0.8 / Math.abs(k);
  return Math.sign(d) * Math.min(Math.abs(d), Math.max(limite, demiLargeurTotale(c) + 4));
}

function couleurColonne(c, d, i, rng, sortie) {
  const w = c.largeur / 2;
  const a = Math.abs(d);
  if (a <= w - 0.22) {
    const u = 0.5 + 0.5 * Math.sin(i * 0.31 + a * 0.7);
    sortie.copy(COUL.asphalte).lerp(COUL.asphalteUse, 0.25 + 0.3 * u);
  } else if (a <= w + 0.02) sortie.copy(COUL.ligne);
  else if (a <= w + BORD.vibreur) {
    sortie.copy(Math.floor(i / 2) % 2 ? COUL.vibreurA : COUL.vibreurB);
  } else if (a <= w + BORD.vibreur + 4) sortie.copy(COUL.degagement);
  else {
    const t = Math.min((a - w - BORD.vibreur - 4) / 70, 1);
    sortie.copy(COUL.herbe).lerp(COUL.herbeLoin, t);
    sortie.multiplyScalar(0.9 + 0.2 * rng());
  }
  return sortie;
}

// Relief hors piste : monte en s'éloignant, avec des ondulations.
function relief(c, i, d) {
  const a = Math.abs(d);
  const marge = demiLargeurTotale(c) + 2;
  if (a <= marge) return 0;
  const t = Math.min((a - marge) / (LARGEUR_DECOR - marge), 1);
  const vague = 1 + 0.45 * Math.sin(i * 0.021 + 1.7) + 0.3 * Math.sin(i * 0.055) + 0.25 * Math.cos(a * 0.03 + i * 0.013);
  return t * t * 26 * Math.max(vague, 0.15);
}

export function construirePiste(c) {
  const groupe = new THREE.Group();
  const N = c.n;
  const col = colonnesDecor(c);
  const M = col.length;
  const rng = mulberry32(c.graine * 31 + 7);
  const pos = new Float32Array(N * M * 3);
  const coul = new Float32Array(N * M * 3);
  const p = [0, 0, 0];
  const t = new THREE.Color();
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const d = ecartSur(c, i, col[j]);
      pointSection(c, i, d, p);
      const k = (i * M + j) * 3;
      pos[k] = p[0];
      pos[k + 1] = p[1] + relief(c, i, d);
      pos[k + 2] = p[2];
      couleurColonne(c, col[j], i, rng, t);
      coul[k] = t.r;
      coul[k + 1] = t.g;
      coul[k + 2] = t.b;
    }
  }
  const idx = new Uint32Array(N * (M - 1) * 6);
  let k = 0;
  for (let i = 0; i < N; i++) {
    const a = i * M;
    const b = ((i + 1) % N) * M;
    for (let j = 0; j < M - 1; j++) {
      idx[k++] = a + j;
      idx[k++] = a + j + 1;
      idx[k++] = b + j;
      idx[k++] = a + j + 1;
      idx[k++] = b + j + 1;
      idx[k++] = b + j;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(coul, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const sol = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  sol.receiveShadow = true;
  sol.name = 'sol';
  groupe.add(sol);

  groupe.add(ligneDepart(c));
  groupe.add(barrieres(c));
  const arbres = vegetation(c, rng);
  if (arbres) groupe.add(arbres);
  return groupe;
}

function ligneDepart(c) {
  const w = c.largeur / 2;
  const pos = [];
  const coul = [];
  const idx = [];
  const p = [0, 0, 0];
  const cases = 14;
  for (let b = 0; b < 4; b++) {
    const i = b;
    for (let j = 0; j <= cases; j++) {
      pointSection(c, i, -w + (c.largeur * j) / cases, p);
      pos.push(p[0], p[1] + 0.012, p[2]);
      const blanc = (b + j) % 2 === 0;
      coul.push(blanc ? 0.93 : 0.08, blanc ? 0.93 : 0.08, blanc ? 0.9 : 0.08);
    }
  }
  for (let b = 0; b < 3; b++)
    for (let j = 0; j < cases; j++) {
      const a = b * (cases + 1) + j;
      const d = (b + 1) * (cases + 1) + j;
      idx.push(a, a + 1, d, a + 1, d + 1, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(coul, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
  m.name = 'ligne';
  return m;
}

function barrieres(c) {
  const bord = demiLargeurTotale(c);
  const pos = [];
  const coul = [];
  const idx = [];
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  const saut = 3;
  const h = 1.5;
  let n = 0;
  for (const cote of [-1, 1]) {
    for (let i = 0; i < c.n; i += saut) {
      pointSection(c, i, cote * (bord + 0.5), a);
      pointSection(c, i + saut, cote * (bord + 0.5), b);
      pos.push(a[0], a[1], a[2], a[0], a[1] + h, a[2], b[0], b[1], b[2], b[0], b[1] + h, b[2]);
      const blanc = Math.floor(i / saut) % 2 === 0;
      for (let v = 0; v < 4; v++) {
        if (blanc) coul.push(0.86, 0.86, 0.84);
        else coul.push(0.78, 0.2, 0.18);
      }
      idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2, n + 2, n + 1, n, n + 2, n + 3, n + 1);
      n += 4;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(coul, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.name = 'barrieres';
  return m;
}

function vegetation(c, rng) {
  const bord = demiLargeurTotale(c) + 14;
  const n = 520;
  const tronc = new THREE.CylinderGeometry(0.28, 0.42, 3, 5);
  tronc.translate(0, 1.5, 0);
  const feuille = new THREE.ConeGeometry(2.4, 8, 6);
  feuille.translate(0, 7, 0);
  const groupe = new THREE.Group();
  groupe.name = 'arbres';
  const mTronc = new THREE.MeshLambertMaterial({ color: 0x4a3a2a });
  const mFeuille = new THREE.MeshLambertMaterial({ color: 0x33522e });
  const iT = new THREE.InstancedMesh(tronc, mTronc, n);
  const iF = new THREE.InstancedMesh(feuille, mFeuille, n);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const e = new THREE.Vector3();
  const p = [0, 0, 0];
  for (let k = 0; k < n; k++) {
    const i = Math.floor(rng() * c.n);
    const cote = rng() < 0.5 ? -1 : 1;
    const d = ecartSur(c, i, cote * (bord + rng() * (LARGEUR_DECOR * 0.6 - bord)));
    if (Math.abs(d) < bord) continue;
    pointSection(c, i, d, p);
    v.set(p[0], p[1] + relief(c, i, d) - 0.3, p[2]);
    const s = 0.7 + rng() * 0.7;
    e.set(s, s * (0.8 + rng() * 0.5), s);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6.28);
    m.compose(v, q, e);
    iT.setMatrixAt(k, m);
    iF.setMatrixAt(k, m);
  }
  iT.instanceMatrix.needsUpdate = true;
  iF.instanceMatrix.needsUpdate = true;
  iF.castShadow = true;
  groupe.add(iT, iF);
  return groupe;
}
