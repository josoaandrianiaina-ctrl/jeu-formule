// Banc d'essai partagé : un monde Rapier, un sol, une voiture.

import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicule, GROUPE } from '../src/physique/vehicule.js';
import { G, PAS } from '../src/config.js';

export { RAPIER, PAS, G };

export async function init() {
  await RAPIER.init();
}

// Sol plat, ou plan incliné d'angle theta (positif = montée vers l'avant, -Z).
export function banc(theta = 0, params = {}) {
  const monde = new RAPIER.World({ x: 0, y: -G, z: 0 });
  monde.timestep = PAS;
  const desc = RAPIER.ColliderDesc.cuboid(400, 1, 9000)
    .setTranslation(0, -1, -8000)
    .setCollisionGroups((GROUPE.sol << 16) | 0xffff)
    .setFriction(0.8);
  if (theta) desc.setRotation({ x: Math.sin(-theta / 2), y: 0, z: 0, w: Math.cos(theta / 2) });
  monde.createCollider(desc);
  const v = new Vehicule(RAPIER, monde, {
    params,
    position: { x: 0, y: v0Hauteur(params), z: 0 },
    rotation: { x: Math.sin(-theta / 2), y: 0, z: 0, w: Math.cos(theta / 2) },
  });
  monde.step();
  return { monde, v };
}

function v0Hauteur(params) {
  return (params.hCdg ?? 0.3) + 0.02;
}

// Avance la simulation. rappel(i) peut lire l'état à chaque pas.
export function simuler({ monde, v }, duree, cmd = {}, rappel = null) {
  const n = Math.round(duree / PAS);
  for (let i = 0; i < n; i++) {
    const c = typeof cmd === 'function' ? cmd(v, i * PAS) : cmd;
    v.pas(PAS, c);
    monde.step();
    if (rappel && rappel(v, i * PAS) === false) return i * PAS;
  }
  return duree;
}

export function stabiliser(b, duree = 2) {
  simuler(b, duree, { gaz: 0, frein: 0, volant: 0 });
}
