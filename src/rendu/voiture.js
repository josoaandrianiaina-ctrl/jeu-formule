// Monoplace construite par code. Repère : avant = -Z, droite = +X, haut = +Y.
// L'origine est le centre de gravité, à hCdg au-dessus du sol.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { VOITURE } from '../config.js';

export const LIVREES = [
  { nom: 'Aurore', corps: 0xd8442f, accent: 0xf2c84b },
  { nom: 'Abysse', corps: 0x1d3f8c, accent: 0x6fd3e0 },
  { nom: 'Menthe', corps: 0x1f7a5c, accent: 0xe9e4d8 },
  { nom: 'Ardoise', corps: 0x2b2f38, accent: 0xe0652a },
];

function boite(l, h, p, x, y, z, rot = 0) {
  const g = new THREE.BoxGeometry(l, h, p);
  if (rot) g.rotateX(rot);
  g.translate(x, y, z);
  return g;
}

function fuseler(g, avantZ, arriereZ, facteurAvant, facteurArriere) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const t = THREE.MathUtils.clamp((z - avantZ) / (arriereZ - avantZ), 0, 1);
    const f = facteurAvant + (facteurArriere - facteurAvant) * t;
    pos.setX(i, pos.getX(i) * f);
  }
  pos.needsUpdate = true;
  return g;
}

export function construireVoiture(livree = LIVREES[0]) {
  const P = VOITURE;
  const y0 = -P.hCdg;
  const groupe = new THREE.Group();
  const avant = -P.empattement * (1 - P.repAvant);
  const arriere = P.empattement * P.repAvant;

  // Coque principale.
  const coque = [
    fuseler(boite(0.95, 0.4, 3.3, 0, y0 + 0.34, 0.1), -1.5, 1.8, 0.72, 1.0),
    fuseler(boite(0.6, 0.3, 1.9, 0, y0 + 0.42, -1.45), -2.4, -0.5, 0.34, 1.0),
    boite(0.78, 0.46, 1.25, 0, y0 + 0.52, 1.25),
    boite(0.42, 0.3, 0.9, 0, y0 + 0.86, 1.2),
  ];
  // Pontons.
  for (const s of [-1, 1]) {
    coque.push(fuseler(boite(0.46, 0.44, 1.9, s * 0.66, y0 + 0.36, 0.55), -0.4, 1.5, 1.0, 0.55));
    coque.push(boite(0.3, 0.1, 2.6, s * 0.92, y0 + 0.12, 0.3));
  }
  const corps = new THREE.Mesh(
    mergeGeometries(coque, false),
    new THREE.MeshLambertMaterial({ color: livree.corps }),
  );
  corps.castShadow = true;
  groupe.add(corps);

  // Ailerons et plaques, en couleur d'accent.
  const acc = [
    boite(1.85, 0.06, 0.62, 0, y0 + 0.17, avant - 0.72, -0.16),
    boite(1.85, 0.05, 0.4, 0, y0 + 0.27, avant - 0.58, -0.3),
    boite(1.1, 0.07, 0.72, 0, y0 + 0.88, arriere + 1.0, 0.24),
    boite(1.1, 0.06, 0.5, 0, y0 + 1.0, arriere + 0.88, 0.4),
    boite(0.9, 0.12, 0.5, 0, y0 + 0.14, arriere + 1.05),
  ];
  for (const s of [-1, 1]) {
    acc.push(boite(0.04, 0.3, 0.75, s * 0.93, y0 + 0.28, avant - 0.7));
    acc.push(boite(0.05, 0.42, 0.8, s * 0.55, y0 + 0.82, arriere + 0.95));
  }
  const accents = new THREE.Mesh(
    mergeGeometries(acc, false),
    new THREE.MeshLambertMaterial({ color: livree.accent }),
  );
  accents.castShadow = true;
  groupe.add(accents);

  // Arceau et casque.
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.045, 6, 16, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x15171c }),
  );
  halo.rotation.set(Math.PI / 2, 0, 0);
  halo.position.set(0, y0 + 0.74, 0.18);
  groupe.add(halo);
  const casque = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 12, 10),
    new THREE.MeshLambertMaterial({ color: livree.accent }),
  );
  casque.position.set(0, y0 + 0.76, 0.42);
  casque.castShadow = true;
  groupe.add(casque);
  const visiere = new THREE.Mesh(
    new THREE.SphereGeometry(0.172, 10, 6, 0, Math.PI, 0.9, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x101216 }),
  );
  visiere.rotation.y = -Math.PI / 2;
  visiere.position.copy(casque.position);
  groupe.add(visiere);

  // Volant, animé par la direction.
  const volant = new THREE.Group();
  const jante = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.022, 5, 12),
    new THREE.MeshLambertMaterial({ color: 0x1b1d22 }),
  );
  volant.add(jante);
  const ecran = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.07),
    new THREE.MeshBasicMaterial({ color: 0x1d3a2a }),
  );
  ecran.position.z = 0.025;
  volant.add(ecran);
  volant.position.set(0, y0 + 0.66, 0.74);
  volant.rotation.x = -0.55;
  groupe.add(volant);

  // Roues : une géométrie partagée, quatre objets.
  const gPneu = new THREE.CylinderGeometry(P.rayonRoue, P.rayonRoue, 0.38, 16);
  gPneu.rotateZ(Math.PI / 2);
  const gJante = new THREE.CylinderGeometry(P.rayonRoue * 0.62, P.rayonRoue * 0.62, 0.4, 10);
  gJante.rotateZ(Math.PI / 2);
  const mPneu = new THREE.MeshLambertMaterial({ color: 0x1a1a1d });
  const mJante = new THREE.MeshLambertMaterial({ color: 0xb8bcc4 });
  const roues = [];
  const pos = [
    [-P.voieAv / 2, avant],
    [P.voieAv / 2, avant],
    [-P.voieAr / 2, arriere],
    [P.voieAr / 2, arriere],
  ];
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(pos[i][0], y0 + P.rayonRoue, pos[i][1]);
    const roue = new THREE.Group();
    const pneu = new THREE.Mesh(gPneu, mPneu);
    pneu.castShadow = true;
    roue.add(pneu);
    const jnt = new THREE.Mesh(gJante, mJante);
    roue.add(jnt);
    const repere = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.04, P.rayonRoue * 1.1),
      new THREE.MeshLambertMaterial({ color: livree.accent }),
    );
    roue.add(repere);
    pivot.add(roue);
    groupe.add(pivot);
    roues.push({ pivot, roue, yRepos: pivot.position.y });
  }

  groupe.userData = { roues, volant, livree };
  return groupe;
}

// Met l'image en accord avec l'état physique.
export function majVoiture(groupe, vehicule, dt = 1 / 60) {
  const { roues, volant } = groupe.userData;
  const P = vehicule.P;
  for (let i = 0; i < 4; i++) {
    const r = roues[i];
    const phys = vehicule.roues[i];
    const course = phys.contact ? phys.comp - phys.compStat : -phys.compStat;
    r.pivot.position.y = r.yRepos + THREE.MathUtils.clamp(course, -P.debattement, P.debattement);
    r.pivot.rotation.y = phys.avant ? vehicule.braquage : 0;
    r.roue.rotation.x -= phys.w * dt;
  }
  volant.rotation.z = -vehicule.braquage * 3.4;
}
