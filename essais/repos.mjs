import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicule, GROUPE } from '../src/physique/vehicule.js';
import { G, PAS } from '../src/config.js';
await RAPIER.init();
const monde = new RAPIER.World({x:0,y:-G,z:0}); monde.timestep = PAS;
monde.createCollider(RAPIER.ColliderDesc.cuboid(200,0.5,30000).setTranslation(0,-0.5,-29000).setCollisionGroups((GROUPE.sol<<16)|0xffff));
const v = new Vehicule(RAPIER, monde, {});
monde.step();
for (let i=0;i<=720;i++){ v.pas(PAS,{gaz:0,frein:0,volant:0}); monde.step(); if(i%120===0||i%120===1){const l=v.corps.linvel(),a=v.corps.angvel(),t=v.corps.translation(); console.log(i, 'lv',l.x.toExponential(2),l.y.toExponential(2),l.z.toExponential(2),'av',a.x.toExponential(1),a.y.toExponential(1),a.z.toExponential(1),'pos',t.x.toFixed(4),t.y.toFixed(4),t.z.toFixed(4),'w',v.roues.map(r=>r.w.toFixed(3)).join(' '),'Fz',v.roues.map(r=>r.Fz.toFixed(1)).join(' '));}}
