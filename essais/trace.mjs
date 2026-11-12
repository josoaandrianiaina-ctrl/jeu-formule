import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicule } from '../src/physique/vehicule.js';
import { G, PAS, SURFACES } from '../src/config.js';
import { genererCircuit, STYLES, localiser, surface } from '../src/circuit/generateur.js';
import { creerCollisions, poseDepart } from '../src/circuit/collisions.js';
import { profilVitesse } from '../src/circuit/profil.js';
import { Pilote } from '../src/ia/pilote.js';
await RAPIER.init();
const c = genererCircuit(STYLES['foret-noire']); const profil = profilVitesse(c);
const monde = new RAPIER.World({x:0,y:-G,z:0}); monde.timestep = PAS; creerCollisions(RAPIER, monde, c);
const v = new Vehicule(RAPIER, monde, poseDepart(c,0,0)); monde.step();
const pilote = new Pilote(c, profil, {rythme:+(process.argv[2]||0.92)});
const adher = (r,x,z)=>{ const l=localiser(c,x,z,r.indice); r.indice=l.i; return SURFACES[surface(c,l.d)]; };
let t=0, n=0, vu=false;
while(t<120){ const cmd=pilote.commande(v); v.pas(PAS,cmd,adher); monde.step(); t+=PAS; n++;
  const l=cmd.loc; const i=l.i;
  if(n%20===0) { if(Math.abs(l.d)>6) vu=true;
    console.log(t.toFixed(1),'s',l.s.toFixed(0),'d',l.d.toFixed(2),'v',(v.tel.vitesse*3.6).toFixed(0),'cible',(profil.vitesse[i]*3.6).toFixed(0),'R',(1/c.courbure[i]).toFixed(0),'pente%',(c.pente[i]*100).toFixed(1),'vol',cmd.volant.toFixed(2),'gaz',cmd.gaz.toFixed(1),'fr',cmd.frein.toFixed(1),'Fz',v.roues.map(r=>r.Fz.toFixed(0)).join('/'),'tanA',v.roues.map(r=>r.tanAlpha.toFixed(2)).join('/')); }
  if(vu && n%60===0 && t>0 && Math.abs(l.d)>15) break;
}
