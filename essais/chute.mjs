import RAPIER from '@dimforge/rapier3d-compat';
import { G, PAS } from '../src/config.js';
await RAPIER.init();
for (const mode of ['simple','massprops','massprops+ccd']) {
  const monde = new RAPIER.World({x:0,y:-G,z:0}); monde.timestep = PAS;
  let d = RAPIER.RigidBodyDesc.dynamic().setTranslation(0,10,0).setCanSleep(false);
  if (mode!=='simple') d = d.setAdditionalMassProperties(800,{x:0,y:0,z:0},{x:900,y:1000,z:150},{x:0,y:0,z:0,w:1});
  if (mode.includes('ccd')) d = d.setCcdEnabled(true);
  const b = monde.createRigidBody(d);
  let cd = RAPIER.ColliderDesc.cuboid(1,0.2,2.6); if (mode!=='simple') cd = cd.setDensity(0);
  monde.createCollider(cd, b);
  // impulsion égale au poids à chaque pas : le corps doit rester immobile
  const out=[];
  for (let i=0;i<240;i++){ b.applyImpulse({x:0,y:b.mass()*G*PAS,z:0}, true); monde.step(); if(i%80===79) out.push(`y=${b.translation().y.toFixed(5)} vy=${b.linvel().y.toExponential(2)} wy=${b.angvel().y.toExponential(1)}`); }
  console.log(mode, 'masse', b.mass().toFixed(1), out.join(' | '));
  // couple : impulsion en un point décalé
}
