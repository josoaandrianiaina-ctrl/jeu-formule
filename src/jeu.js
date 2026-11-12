// Boucle de jeu : physique à pas fixe, rendu interpolé, écran de course.

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { G, PAS, SURFACES } from './config.js';
import { clamp, formatTemps, tourner } from './util/maths.js';
import { genererCircuit, STYLES, localiser, surface, dansZoneDrs } from './circuit/generateur.js';
import { creerCollisions, poseDepart } from './circuit/collisions.js';
import { Vehicule } from './physique/vehicule.js';
import { creerScene, suivreCiel, suivreOmbre } from './rendu/scene.js';
import { construirePiste } from './rendu/piste.js';
import { construireVoiture, majVoiture, LIVREES } from './rendu/voiture.js';
import { Entrees } from './entrees.js';
import { Ath, Chrono } from './ath.js';

const MAX_PAS = 10;
const CLE_RECORDS = 'jeu-formule:records:v1';

export class Jeu {
  constructor(options) {
    this.opt = options;
    this.racine = document.body;
    this.camera = 'poursuite';
    this.fps = 60;
    this._cadres = 0;
    this._tFps = 0;
    this.echelle = 1;
    this.pause = false;
  }

  async demarrer() {
    await RAPIER.init();
    const style = STYLES[this.opt.circuit] || STYLES['foret-noire'];
    this.c = genererCircuit(style);

    this.monde = new RAPIER.World({ x: 0, y: -G, z: 0 });
    this.monde.timestep = PAS;
    creerCollisions(RAPIER, this.monde, this.c);
    this.pose = poseDepart(this.c, 0, 0);
    this.vehicule = new Vehicule(RAPIER, this.monde, this.pose);
    this.monde.step();

    this._creerRendu();
    this.entrees = new Entrees(this.racine);
    this.ath = new Ath(this.racine, this.c);
    this.chrono = new Chrono(this.c, this.opt.duree ?? 600);
    this.chrono.meilleur = this._lireRecord();

    this.indice = this.pose.indice;
    this._prec = this._lireTransform();
    this._cour = this._lireTransform();
    this._acc = 0;
    this._tPrec = performance.now() / 1000;
    this._horsPiste = 0;
    this.ath.message(`${this.c.nom} · ${(this.c.longueur / 1000).toFixed(2)} km`, 3.2);
    this._boucle = this._boucle.bind(this);
    requestAnimationFrame(this._boucle);
  }

  _creerRendu() {
    const canvas = document.getElementById('scene');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene = creerScene();
    this.piste = construirePiste(this.c);
    this.scene.add(this.piste);
    this.voiture = construireVoiture(LIVREES[this.opt.livree ?? 0]);
    this.scene.add(this.voiture);

    this.cam = new THREE.PerspectiveCamera(62, 1, 0.3, 460);
    this.camRetro = new THREE.PerspectiveCamera(58, 4, 0.5, 460);
    // Le rétroviseur ignore la végétation : deux rendus coûtent cher sur téléphone.
    this.camRetro.layers.enable(0);
    const arbres = this.piste.getObjectByName('arbres');
    if (arbres) {
      arbres.traverse((o) => o.layers.set(2));
      this.cam.layers.enable(2);
    }
    this._cible = new THREE.Vector3();
    this._camPos = new THREE.Vector3();
    this._init = false;
    this._redim = () => this._dimensionner();
    addEventListener('resize', this._redim);
    addEventListener('orientationchange', this._redim);
    this._dimensionner();
  }

  _dimensionner() {
    const l = innerWidth;
    const h = innerHeight;
    this.renderer.setSize(l, h, false);
    this.cam.aspect = l / h;
    this.cam.updateProjectionMatrix();
    this.largeur = l;
    this.hauteur = h;
    const r = this.racine.querySelector('#retro');
    this.rectRetro = r ? r.getBoundingClientRect() : null;
  }

  _lireTransform() {
    const t = this.vehicule.corps.translation();
    const q = this.vehicule.corps.rotation();
    return { p: new THREE.Vector3(t.x, t.y, t.z), q: new THREE.Quaternion(q.x, q.y, q.z, q.w) };
  }

  _lireRecord() {
    try {
      const d = JSON.parse(localStorage.getItem(CLE_RECORDS) || '{}');
      return d[this.opt.circuit] || null;
    } catch {
      return null;
    }
  }

  _ecrireRecord(t) {
    try {
      const d = JSON.parse(localStorage.getItem(CLE_RECORDS) || '{}');
      d[this.opt.circuit] = t;
      localStorage.setItem(CLE_RECORDS, JSON.stringify(d));
    } catch {
      /* stockage indisponible : le record reste valable pour la session */
    }
  }

  changerCamera() {
    this.camera = this.camera === 'poursuite' ? 'cockpit' : 'poursuite';
    this._init = false;
    return this.camera;
  }

  replacer() {
    const l = localiser(this.c, this.vehicule.corps.translation().x, this.vehicule.corps.translation().z, this.indice);
    const pose = poseDepart(this.c, l.s, 0);
    this.vehicule.placer(pose.position, pose.rotation);
    this.chrono.tourCourant = 0;
    this.chrono._trace = [];
    this.chrono.delta = null;
    this._horsPiste = 0;
    this._init = false;
    this.ath.message('Voiture replacée · tour annulé');
    this.chrono._lance = false;
  }

  _adherence(r, x, z) {
    const l = localiser(this.c, x, z, r.indice);
    r.indice = l.i;
    return SURFACES[surface(this.c, l.d)];
  }

  _boucle(ms) {
    requestAnimationFrame(this._boucle);
    const t = ms / 1000;
    let dt = Math.min(t - this._tPrec, 0.25);
    this._tPrec = t;
    this._cadres++;
    this._tFps += dt;
    if (this._tFps > 0.5) {
      const f = this._cadres / this._tFps;
      this.fps = this.fps * 0.5 + f * 0.5;
      this._cadres = 0;
      this._tFps = 0;
      this._adapter();
      const el = document.getElementById('fps');
      if (el) el.textContent = Math.round(this.fps);
    }
    if (this.pause) {
      this.renderer.render(this.scene, this.cam);
      return;
    }

    const cmd = this.entrees.lire(dt);
    const pos = this.vehicule.corps.translation();
    const loc = localiser(this.c, pos.x, pos.z, this.indice);
    this.indice = loc.i;
    const drsPermis = dansZoneDrs(this.c, loc.s);
    cmd.drs = cmd.drs && drsPermis && this.vehicule.tel.vitesse > 25;

    this._acc += dt;
    let n = 0;
    while (this._acc >= PAS && n < MAX_PAS) {
      this._prec = this._cour;
      this.vehicule.pas(PAS, cmd, this._adherence.bind(this));
      this.monde.step();
      this._cour = this._lireTransform();
      this._acc -= PAS;
      n++;
      const ev = this.chrono.pas(PAS, loc.s);
      if (ev) this._tourFini(ev);
    }
    if (n === MAX_PAS) this._acc = 0;

    const alpha = clamp(this._acc / PAS, 0, 1);
    const p = this._prec.p.clone().lerp(this._cour.p, alpha);
    const q = this._prec.q.clone().slerp(this._cour.q, alpha);
    this.voiture.position.copy(p);
    this.voiture.quaternion.copy(q);
    majVoiture(this.voiture, this.vehicule, dt);
    suivreOmbre(this.scene, p.x, p.y, p.z);
    this._placerCameras(p, q, dt);
    suivreCiel(this.scene, this.cam);

    this.ath.majPilotage(this.vehicule.tel, drsPermis);
    this.ath.majChrono(this.chrono);
    this.ath.dessinerCarte(loc.i);
    this.ath.majMessage();
    this._surveiller(loc, dt);
    this._rendre();
  }

  _adapter() {
    // Résolution dynamique : la fluidité passe avant la finesse de l'image.
    let e = this.echelle;
    if (this.fps < 45 && e > 0.62) e -= 0.08;
    else if (this.fps > 57 && e < 1) e += 0.04;
    e = clamp(e, 0.6, 1);
    if (Math.abs(e - this.echelle) > 0.001) {
      this.echelle = e;
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6) * e);
      this._dimensionner();
    }
  }

  _placerCameras(p, q, dt) {
    const haut = tourner(q, [0, 1, 0]);
    const avant = tourner(q, [0, 0, -1]);
    if (this.camera === 'poursuite') {
      const v = Math.min(this.vehicule.tel.vitesse / 90, 1);
      const recul = 7.4 + v * 2.2;
      const hauteur = 2.5 + v * 0.35;
      this._camPos.set(
        p.x - avant[0] * recul + haut[0] * hauteur,
        p.y - avant[1] * recul + haut[1] * hauteur,
        p.z - avant[2] * recul + haut[2] * hauteur,
      );
      if (!this._init) {
        this.cam.position.copy(this._camPos);
        this._init = true;
      } else {
        this.cam.position.lerp(this._camPos, Math.min(1, dt * 9));
      }
      this._cible.set(p.x + avant[0] * 11, p.y + avant[1] * 11 + 1.1, p.z + avant[2] * 11);
      this.cam.lookAt(this._cible);
      this.cam.fov = 60 + v * 12;
    } else {
      const d = 0.34;
      this.cam.position.set(
        p.x + avant[0] * d + haut[0] * 0.72,
        p.y + avant[1] * d + haut[1] * 0.72,
        p.z + avant[2] * d + haut[2] * 0.72,
      );
      this._cible.set(p.x + avant[0] * 30, p.y + avant[1] * 30 + 0.9, p.z + avant[2] * 30);
      this.cam.lookAt(this._cible);
      this.cam.up.set(haut[0], haut[1], haut[2]);
      this.cam.fov = 70;
      this._init = true;
    }
    this.cam.updateProjectionMatrix();
    this.camRetro.position.set(p.x + haut[0] * 1.1, p.y + haut[1] * 1.1, p.z + haut[2] * 1.1);
    this.camRetro.up.set(haut[0], haut[1], haut[2]);
    this.camRetro.lookAt(p.x - avant[0] * 40, p.y - avant[1] * 40 + 1.4, p.z - avant[2] * 40);
  }

  _rendre() {
    const r = this.renderer;
    r.setScissorTest(false);
    r.setViewport(0, 0, this.largeur, this.hauteur);
    r.render(this.scene, this.cam);
    const rect = this.rectRetro;
    if (rect && rect.width > 10) {
      const x = rect.left;
      const y = this.hauteur - rect.bottom;
      r.setScissorTest(true);
      r.setScissor(x, y, rect.width, rect.height);
      r.setViewport(x, y, rect.width, rect.height);
      this.camRetro.aspect = rect.width / rect.height;
      this.camRetro.updateProjectionMatrix();
      r.clearDepth();
      suivreCiel(this.scene, this.camRetro);
      r.render(this.scene, this.camRetro);
      suivreCiel(this.scene, this.cam);
      r.setScissorTest(false);
    }
  }

  _tourFini(ev) {
    if (ev.type === 'record') {
      this._ecrireRecord(ev.temps);
      this.ath.message('Meilleur tour · ' + formatTemps(ev.temps), 3.4);
    } else {
      this.ath.message('Tour ' + this.chrono.tours + ' · ' + formatTemps(ev.temps), 2.4);
    }
  }

  _surveiller(loc, dt) {
    const haut = tourner(this.vehicule.corps.rotation(), [0, 1, 0]);
    const renverse = haut[1] < 0.2;
    const lent = this.vehicule.tel.vitesse < 3;
    const dehors = Math.abs(loc.d) > this.c.largeur / 2 + 3;
    if (renverse || (dehors && lent)) this._horsPiste += dt;
    else this._horsPiste = 0;
    if (this._horsPiste > 2.5) this.replacer();
  }
}
