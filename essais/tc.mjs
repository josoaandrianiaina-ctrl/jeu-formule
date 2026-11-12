import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicule, GROUPE } from '../src/physique/vehicule.js';
import { G, PAS, VOITURE as P } from '../src/config.js';
import { adherence } from '../src/physique/pneu.js';
await RAPIER.init();
// Référence 1D : adhérence limitée puis puissance limitée.
function ref(){ let v=0,t=0; const dt=0.001; const out={}; const L=P.empattement; 
  while(v<300/3.6 && t<60){ const q=0.5*P.rho*v*v; const D=q*P.CzA, T=q*P.CxA; let a=5;
    for(let k=0;k<20;k++){ const FzR=(P.masse*G*(1-P.repAvant)+D*(1-P.repAeroAv)+P.masse*a*P.hCdg/L)/2; const Ft=Math.min(2*adherence(FzR)*FzR, v>1? P.puissance*P.rendement/v : 1e9); a=(Ft-T-P.crr*(P.masse*G+D))/P.masse; }
    v+=a*dt; t+=dt; for(const j of [100,200,300]) if(!out[j] && v*3.6>=j) out[j]=t.toFixed(2); }
  return out; }
console.log('reference', JSON.stringify(ref()));
for (const [seuil,kp,ki] of [[0.12,6,20],[0.10,6,20],[0.10,12,40],[0.09,10,60],[0.10,20,0],[0.11,15,10]]) {
  const monde = new RAPIER.World({x:0,y:-G,z:0}); monde.timestep = PAS;
  monde.createCollider(RAPIER.ColliderDesc.cuboid(200,0.5,30000).setTranslation(0,-0.5,-29000).setCollisionGroups((GROUPE.sol<<16)|0xffff));
  const v = new Vehicule(RAPIER, monde, {params:{tcSeuil:seuil,tcKp:kp,tcKi:ki}}); monde.step();
  for(let i=0;i<120;i++){v.pas(PAS,{gaz:0,frein:1,volant:0});monde.step();}
  const out={}; let t=0, kmax=0, ksum=0,n=0;
  while(t<20){ v.pas(PAS,{gaz:1,frein:0,volant:0}); monde.step(); t+=PAS; const k=v.tel.vitesse*3.6; for(const j of [100,200,300]) if(!out[j]&&k>=j) out[j]=t.toFixed(2); if(k<150){const kk=(v.roues[2].kappa+v.roues[3].kappa)/2; kmax=Math.max(kmax,kk); ksum+=kk;n++;} }
  console.log('seuil',seuil,'kp',kp,'ki',ki, JSON.stringify(out),'kappa moy <150',(ksum/n).toFixed(3),'max',kmax.toFixed(2));
  monde.free();
}
