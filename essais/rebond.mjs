import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicule } from '../src/physique/vehicule.js';
import { G, PAS, SURFACES } from '../src/config.js';
import { genererCircuit, STYLES, localiser, surface } from '../src/circuit/generateur.js';
import { creerCollisions, poseDepart, pointSection } from '../src/circuit/collisions.js';
import { profilVitesse } from '../src/circuit/profil.js';
import { Pilote } from '../src/ia/pilote.js';
await RAPIER.init();
const c = genererCircuit(STYLES['foret-noire']); const profil = profilVitesse(c);
const monde = new RAPIER.World({x:0,y:-G,z:0}); monde.timestep = PAS; creerCollisions(RAPIER, monde, c);
const v = new Vehicule(RAPIER, monde, poseDepart(c,0,0)); monde.step();
const pilote = new Pilote(c, profil, {rythme:0.92});
const adher = (r,x,z)=>{ const l=localiser(c,x,z,r.indice); r.indice=l.i; return SURFACES[surface(c,l.d)]; };
let t=0, n=0; const hist=[];
while(t<14){ const cmd=pilote.commande(v); v.pas(PAS,cmd,adher); monde.step(); t+=PAS; n++;
  const p=v.corps.translation(); const lv=v.corps.linvel(); const l=cmd.loc;
  const sol=pointSection(c,l.i,l.d);
  const h=p.y-sol[1]; const air=v.roues.filter(r=>!r.contact).length;
  hist.push({t,h,vy:lv.y,air,comp:v.roues.map(r=>r.comp),Fz:v.roues.map(r=>r.Fz),s:l.s,i:l.i});
}
// premier décollage
const k=hist.findIndex(x=>x.air===4);
console.log('premier décollage total a t=',k<0?'jamais':hist[k].t.toFixed(2));
const d=Math.max(0,(k<0?300:k)-45);
for(let j=d;j<d+70;j+=3){const x=hist[j]; if(!x)break;
 console.log(x.t.toFixed(3),'h',x.h.toFixed(4),'vy',x.vy.toFixed(2),'air',x.air,'comp mm',x.comp.map(a=>(a*1000).toFixed(0)).join('/'),'Fz',x.Fz.map(a=>a.toFixed(0)).join('/'),'i',x.i);}
// pente locale échantillonnée
const i0=hist[Math.max(0,k)].i;
console.log('y autour:', Array.from({length:12},(_,m)=>c.y[(i0-6+m+c.n)%c.n].toFixed(3)).join(' '));
console.log('pente autour:', Array.from({length:12},(_,m)=>(c.pente[(i0-6+m+c.n)%c.n]*100).toFixed(2)).join(' '));
