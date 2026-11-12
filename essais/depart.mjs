import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicule, GROUPE } from '../src/physique/vehicule.js';
import { G, PAS } from '../src/config.js';
import { adherence } from '../src/physique/pneu.js';
await RAPIER.init();
const monde = new RAPIER.World({x:0,y:-G,z:0}); monde.timestep = PAS;
monde.createCollider(RAPIER.ColliderDesc.cuboid(200,0.5,30000).setTranslation(0,-0.5,-29000).setCollisionGroups((GROUPE.sol<<16)|0xffff));
const v = new Vehicule(RAPIER, monde, {}); monde.step();
for(let i=0;i<120;i++){v.pas(PAS,{gaz:0,frein:1,volant:0});monde.step();}
let acc=0,n=0;
for(let i=0;i<1200;i++){ v.pas(PAS,{gaz:1,frein:0,volant:0}); monde.step(); acc+=v.tel.aLong; n++;
 if(i%60===59){ const r=v.roues[2]; console.log((i*PAS).toFixed(2),'v',(v.tel.vitesse*3.6).toFixed(0),'a moy',(acc/n).toFixed(2),'coupe',v.tel.coupe.toFixed(2),'k',r.kappa.toFixed(3),'FzAr',r.Fz.toFixed(0),'fx',r.fx.toFixed(0),'muFz',(adherence(r.Fz)*r.Fz).toFixed(0),'rap',v.tel.rapport,'rpm',v.tel.regime.toFixed(0),'tanA',r.tanAlpha.toExponential(1)); acc=0;n=0; } }
