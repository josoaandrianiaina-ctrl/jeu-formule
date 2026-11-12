import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicule, GROUPE } from '../src/physique/vehicule.js';
import { G, PAS } from '../src/config.js';
await RAPIER.init();
const monde = new RAPIER.World({x:0,y:-G,z:0}); monde.timestep = PAS;
monde.createCollider(RAPIER.ColliderDesc.cuboid(200,0.5,30000).setTranslation(0,-0.5,-29000).setCollisionGroups((GROUPE.sol<<16)|0xffff));
const v = new Vehicule(RAPIER, monde, {});
monde.step();
for (let i=0;i<=600;i++){ v.pas(PAS,{gaz:0,frein:0,volant:0}); monde.step(); }
const q=v.corps.rotation(); console.log('rot',q.x.toFixed(5),q.y.toFixed(5),q.z.toFixed(5),q.w.toFixed(5));
for (const r of v.roues) console.log('roue x',r.x,'z',r.z.toFixed(2),'w',r.w.toFixed(4),'kappa',r.kappa.toExponential(2),'tanA',r.tanAlpha.toExponential(2),'fx',r.fx.toFixed(2),'fy',r.fy.toFixed(2),'pt',r.point.map(a=>a.toFixed(3)).join(','));
const c=v.collisionneur; console.log('com local', JSON.stringify(v.corps.localCom()), 'masse', v.corps.mass());
