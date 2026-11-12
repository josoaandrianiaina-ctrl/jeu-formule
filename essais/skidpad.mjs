import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicule, GROUPE } from '../src/physique/vehicule.js';
import { G, PAS, VOITURE as P } from '../src/config.js';
import { clamp } from '../src/util/maths.js';
await RAPIER.init();
const monde = new RAPIER.World({x:0,y:-G,z:0}); monde.timestep = PAS;
monde.createCollider(RAPIER.ColliderDesc.cuboid(3000,0.5,3000).setTranslation(0,-0.5,0).setCollisionGroups((GROUPE.sol<<16)|0xffff));
const v = new Vehicule(RAPIER, monde, {}); monde.step();
const R = +(process.argv[2]||67), vCible=+(process.argv[3]||31.4);
let vol=0, t=0;
// accélère en ligne droite jusqu'à la vitesse voulue
while(v.tel.vitesse<vCible && t<40){ v.pas(PAS,{gaz:1,frein:0,volant:0}); monde.step(); t+=PAS; }
// régulateur simple : maintient le rayon
let sum=0,n=0, fzs=[0,0,0,0], tas=[0,0,0,0], vmin=99, fzOsc=[0,0,0,0], prev=null;
for(let i=0;i<1800;i++){
  const av=v.corps.angvel(), lv=v.corps.linvel(); const sp=Math.hypot(lv.x,lv.z);
  const lacetCible = sp/R;
  vol = clamp(vol + (lacetCible - Math.abs(av.y))*0.6, 0, 1);
  const gaz = sp<vCible? clamp((vCible-sp)*0.5,0,1):0.15;
  v.pas(PAS,{gaz,frein:0,volant:vol}); monde.step();
  if(i>900){ const aLat=sp*Math.abs(av.y); sum+=aLat;n++; vmin=Math.min(vmin,sp);
    v.roues.forEach((r,k)=>{fzs[k]+=r.Fz; tas[k]+=Math.abs(r.tanAlpha); if(prev) fzOsc[k]+=Math.abs(r.Fz-prev[k]);});
    prev=v.roues.map(r=>r.Fz); }
}
const a=sum/n; const f=fzs.map(x=>x/n), ta=tas.map(x=>x/n), osc=fzOsc.map(x=>x/n);
console.log('R',R,'v',(vmin*3.6).toFixed(0),'km/h  aLat',(a/G).toFixed(2),'g');
console.log('Fz moy', f.map(x=>x.toFixed(0)).join('/'), ' part avant', (100*(f[0]+f[1])/(f[0]+f[1]+f[2]+f[3])).toFixed(0)+'%');
console.log('tanAlpha moy', ta.map(x=>x.toFixed(3)).join('/'), '  (pic a', Math.tan(P.alphaPic).toFixed(3),')');
console.log('oscillation Fz par pas', osc.map(x=>x.toFixed(0)).join('/'));
