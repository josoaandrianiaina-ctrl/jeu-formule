import RAPIER from '@dimforge/rapier3d-compat';
import { Vehicule } from '../src/physique/vehicule.js';
import { G, PAS, SURFACES } from '../src/config.js';
import { genererCircuit, STYLES, localiser, surface } from '../src/circuit/generateur.js';
import { creerCollisions, poseDepart } from '../src/circuit/collisions.js';
import { profilVitesse } from '../src/circuit/profil.js';
import { Pilote } from '../src/ia/pilote.js';
await RAPIER.init();
const style = process.argv[2] || 'foret-noire'; const rythme = +(process.argv[3]||0.92);
const c = genererCircuit(STYLES[style]);
const profil = profilVitesse(c);
let vmin=1e9,vmaxp=0; for(const x of profil.vitesse){vmin=Math.min(vmin,x);vmaxp=Math.max(vmaxp,x);}
console.log(style,'L',c.longueur.toFixed(0),'profil v min/max km/h',(vmin*3.6).toFixed(0),(vmaxp*3.6).toFixed(0));
const monde = new RAPIER.World({x:0,y:-G,z:0}); monde.timestep = PAS;
const t0=performance.now(); creerCollisions(RAPIER, monde, c); 
const pose = poseDepart(c, 0, 0);
const v = new Vehicule(RAPIER, monde, pose); monde.step();
console.log('collisions ms',(performance.now()-t0).toFixed(0),'colliders',monde.colliders.len());
const pilote = new Pilote(c, profil, {rythme});
const adher = (r,x,z)=>{ const l=localiser(c,x,z,r.indice); r.indice=l.i; return SURFACES[surface(c,l.d)]; };
let t=0, sPrec=0, tours=0, tTour=0, dMax=0, hors=0, vMaxT=0, yMin=1e9, aLatMax=0; const temps=[];
const tSim=performance.now();
while(t<400 && tours<3){ const cmd=pilote.commande(v); v.pas(PAS,cmd,adher); monde.step(); t+=PAS; tTour+=PAS;
  const s=cmd.loc.s; if(s<sPrec-c.longueur/2){ tours++; temps.push(tTour.toFixed(2)); tTour=0; } sPrec=s;
  dMax=Math.max(dMax,Math.abs(cmd.loc.d)); if(Math.abs(cmd.loc.d)>c.largeur/2) hors++; vMaxT=Math.max(vMaxT,v.tel.vitesse);
  const p=v.corps.translation(); if(!isFinite(p.x)) {console.log('NaN a t',t); break;} 
}
console.log('tours',tours,'temps',temps.join(' '),'ecart max m',dMax.toFixed(2),'pas hors piste',hors,'v max km/h',(vMaxT*3.6).toFixed(0),'cout sim: ',((performance.now()-tSim)/ (t/PAS)*1000).toFixed(1),'us/pas');
