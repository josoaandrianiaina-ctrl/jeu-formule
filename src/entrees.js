// Commandes : zones tactiles, inclinaison du téléphone, clavier pour les essais sur ordinateur.

import { clamp } from './util/maths.js';

export class Entrees {
  constructor(racine) {
    this.racine = racine;
    this.gaz = 0;
    this.frein = 0;
    this.volant = 0;
    this.drs = false;
    this.mode = 'tactile'; // 'tactile' ou 'inclinaison'
    this.sensibilite = 1;
    this.inverser = false;
    this.inclinaisonDispo = false;
    this.inclinaisonActive = false;
    this.neutre = 0;
    this._brut = 0;
    this._filtre = 0;
    this._touches = new Set();
    this._glisse = null;
    this._clavier = { gauche: false, droite: false, gaz: false, frein: false, drs: false };
    this._installerBoutons();
    this._installerGlisse();
    this._installerClavier();
  }

  _presse(el, debut, fin) {
    const bas = (e) => {
      e.preventDefault();
      el.classList.add('actif');
      debut();
    };
    const haut = (e) => {
      e.preventDefault();
      el.classList.remove('actif');
      fin();
    };
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      bas(e);
    });
    el.addEventListener('pointerup', haut);
    el.addEventListener('pointercancel', haut);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _installerBoutons() {
    const q = (s) => this.racine.querySelector(s);
    this._presse(
      q('#btn-gaz'),
      () => (this._gazPresse = true),
      () => (this._gazPresse = false),
    );
    this._presse(
      q('#btn-frein'),
      () => (this._freinPresse = true),
      () => (this._freinPresse = false),
    );
    const drs = q('#btn-drs');
    this._presse(
      drs,
      () => (this._drsPresse = true),
      () => (this._drsPresse = false),
    );
  }

  // Glisser horizontalement sur la bande centrale fait tourner la voiture.
  _installerGlisse() {
    const zone = this.racine.querySelector('#zone-direction');
    const debut = (e) => {
      if (this.mode === 'inclinaison' && this.inclinaisonActive) return;
      zone.setPointerCapture(e.pointerId);
      this._glisse = { id: e.pointerId, x0: e.clientX, v0: this.volant };
    };
    const bouge = (e) => {
      if (!this._glisse || e.pointerId !== this._glisse.id) return;
      const dx = e.clientX - this._glisse.x0;
      const plage = Math.min(window.innerWidth * 0.3, 260);
      this.volant = clamp(this._glisse.v0 + dx / plage, -1, 1);
    };
    const fin = (e) => {
      if (this._glisse && e.pointerId === this._glisse.id) this._glisse = null;
    };
    zone.addEventListener('pointerdown', debut);
    zone.addEventListener('pointermove', bouge);
    zone.addEventListener('pointerup', fin);
    zone.addEventListener('pointercancel', fin);
  }

  _installerClavier() {
    const carte = {
      ArrowLeft: 'gauche',
      KeyA: 'gauche',
      KeyQ: 'gauche',
      ArrowRight: 'droite',
      KeyD: 'droite',
      ArrowUp: 'gaz',
      KeyW: 'gaz',
      KeyZ: 'gaz',
      ArrowDown: 'frein',
      KeyS: 'frein',
      Space: 'frein',
      ShiftLeft: 'drs',
      KeyE: 'drs',
    };
    addEventListener('keydown', (e) => {
      const k = carte[e.code];
      if (k) {
        this._clavier[k] = true;
        e.preventDefault();
      }
    });
    addEventListener('keyup', (e) => {
      const k = carte[e.code];
      if (k) this._clavier[k] = false;
    });
  }

  // L'inclinaison exige HTTPS, et une autorisation donnée par un appui sur iPhone.
  async activerInclinaison() {
    const D = window.DeviceMotionEvent;
    if (!D) return { ok: false, raison: "Ce navigateur n'expose pas l'inclinaison." };
    try {
      if (typeof D.requestPermission === 'function') {
        const r = await D.requestPermission();
        if (r !== 'granted') return { ok: false, raison: 'Autorisation refusée.' };
      }
    } catch (e) {
      return { ok: false, raison: "L'autorisation a échoué : " + e.message };
    }
    let recu = false;
    addEventListener('devicemotion', (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a || (a.x === null && a.y === null)) return;
      recu = true;
      this.inclinaisonDispo = true;
      const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
      let sx;
      if (angle === 90) sx = a.y;
      else if (angle === 270 || angle === -90) sx = -a.y;
      else if (angle === 180) sx = -a.x;
      else sx = a.x;
      this._brut = sx / 9.81;
    });
    await new Promise((r) => setTimeout(r, 400));
    if (!recu) return { ok: false, raison: 'Aucune donnée reçue du capteur.' };
    this.inclinaisonActive = true;
    this.mode = 'inclinaison';
    this.centrer();
    return { ok: true };
  }

  centrer() {
    this.neutre = this._brut;
  }

  desactiverInclinaison() {
    this.inclinaisonActive = false;
    this.mode = 'tactile';
    this.volant = 0;
  }

  lire(dt) {
    const c = this._clavier;
    this.gaz = this._gazPresse || c.gaz ? 1 : 0;
    this.frein = this._freinPresse || c.frein ? 1 : 0;
    this.drs = !!(this._drsPresse || c.drs);

    if (this.mode === 'inclinaison' && this.inclinaisonActive) {
      const brut = (this._brut - this.neutre) * (this.inverser ? -1 : 1);
      // Filtre passe-bas : le capteur est bruité.
      this._filtre += (brut - this._filtre) * Math.min(1, dt * 14);
      const zoneMorte = 0.04;
      const a = Math.abs(this._filtre);
      const u = a < zoneMorte ? 0 : (a - zoneMorte) / (0.55 - zoneMorte);
      this.volant = clamp(Math.sign(this._filtre) * u * u * 1.25 * this.sensibilite, -1, 1);
    } else if (c.gauche || c.droite) {
      const cible = (c.droite ? 1 : 0) - (c.gauche ? 1 : 0);
      this.volant += clamp(cible - this.volant, -dt * 3.2, dt * 3.2);
    } else if (!this._glisse) {
      // Retour au centre quand le doigt est levé.
      const k = Math.min(1, dt * 6);
      this.volant += (0 - this.volant) * k;
      if (Math.abs(this.volant) < 0.01) this.volant = 0;
    }
    return { gaz: this.gaz, frein: this.frein, volant: this.volant, drs: this.drs };
  }
}
