// Affichage tête haute : chrono, secteurs, mini-carte, écran du volant.

import { formatTemps } from './util/maths.js';

export class Ath {
  constructor(racine, circuit) {
    this.r = racine;
    this.c = circuit;
    this.q = (s) => racine.querySelector(s);
    this.elVitesse = this.q('#vitesse');
    this.elRapport = this.q('#rapport');
    this.elRegime = this.q('#regime-barre');
    this.elChrono = this.q('#chrono');
    this.elMeilleur = this.q('#meilleur');
    this.elDelta = this.q('#delta');
    this.elTour = this.q('#tour');
    this.elSession = this.q('#session');
    this.elSecteurs = [this.q('#s1'), this.q('#s2'), this.q('#s3')];
    this.elDrs = this.q('#btn-drs');
    this.elMessage = this.q('#message');
    this.carte = this.q('#carte');
    this.ctx = this.carte.getContext('2d');
    this._preparerCarte();
    this._msgFin = 0;
  }

  _preparerCarte() {
    const c = this.c;
    let xmin = 1e9;
    let xmax = -1e9;
    let zmin = 1e9;
    let zmax = -1e9;
    for (let i = 0; i < c.n; i++) {
      xmin = Math.min(xmin, c.x[i]);
      xmax = Math.max(xmax, c.x[i]);
      zmin = Math.min(zmin, c.z[i]);
      zmax = Math.max(zmax, c.z[i]);
    }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const l = this.carte.clientWidth || 104;
    const h = this.carte.clientHeight || 104;
    this.carte.width = l * dpr;
    this.carte.height = h * dpr;
    this.ctx.scale(dpr, dpr);
    const marge = 9;
    const e = Math.min((l - 2 * marge) / (xmax - xmin), (h - 2 * marge) / (zmax - zmin));
    this.proj = (i) => [
      marge + (c.x[i] - xmin) * e + (l - 2 * marge - (xmax - xmin) * e) / 2,
      marge + (c.z[i] - zmin) * e + (h - 2 * marge - (zmax - zmin) * e) / 2,
    ];
    this.tailleCarte = [l, h];
  }

  dessinerCarte(iVoiture) {
    const g = this.ctx;
    const c = this.c;
    const [l, h] = this.tailleCarte;
    g.clearRect(0, 0, l, h);
    g.beginPath();
    for (let i = 0; i <= c.n; i += 4) {
      const [x, y] = this.proj(i % c.n);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.strokeStyle = 'rgba(255,255,255,0.32)';
    g.lineWidth = 4.5;
    g.lineJoin = 'round';
    g.stroke();
    g.strokeStyle = 'rgba(16,18,24,0.9)';
    g.lineWidth = 2;
    g.stroke();
    const [dx, dy] = this.proj(0);
    g.fillStyle = '#e9e6df';
    g.fillRect(dx - 2.5, dy - 2.5, 5, 5);
    const [vx, vy] = this.proj(iVoiture);
    g.beginPath();
    g.arc(vx, vy, 3.6, 0, 6.2832);
    g.fillStyle = '#ff5a3c';
    g.fill();
    g.strokeStyle = '#1a1c22';
    g.lineWidth = 1.2;
    g.stroke();
  }

  majPilotage(tel, drsPermis) {
    this.elVitesse.textContent = Math.round(tel.vitesse * 3.6);
    this.elRapport.textContent = tel.rapport;
    const u = Math.min(tel.regime / 12000, 1);
    this.elRegime.style.setProperty('--u', u.toFixed(3));
    this.elRegime.classList.toggle('haut', u > 0.93);
    this.elDrs.classList.toggle('permis', !!drsPermis);
    this.elDrs.classList.toggle('ouvert', !!tel.drs);
  }

  majChrono(ch) {
    this.elChrono.textContent = formatTemps(ch.tourCourant);
    this.elMeilleur.textContent = ch.meilleur ? formatTemps(ch.meilleur) : '—';
    this.elTour.textContent = ch.tours;
    this.elSession.textContent = ch.restant > 0 ? formatTemps(ch.restant).slice(0, -4) : '—';
    for (let i = 0; i < 3; i++) {
      const el = this.elSecteurs[i];
      const s = ch.secteurs[i];
      el.textContent = s ? formatTemps(s).slice(1) : '—';
      el.className = 'secteur ' + (ch.couleurs[i] || '');
    }
    if (ch.delta === null) {
      this.elDelta.textContent = '';
      this.elDelta.className = 'delta';
    } else {
      const d = ch.delta;
      this.elDelta.textContent = (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(2);
      this.elDelta.className = 'delta ' + (d < 0 ? 'gain' : 'perte');
    }
  }

  message(texte, duree = 2.6) {
    this.elMessage.textContent = texte;
    this.elMessage.classList.add('visible');
    this._msgFin = performance.now() / 1000 + duree;
  }

  majMessage() {
    if (this._msgFin && performance.now() / 1000 > this._msgFin) {
      this.elMessage.classList.remove('visible');
      this._msgFin = 0;
    }
  }
}

// Chronométrage : tours, secteurs, meilleur tour, écart au meilleur.
export class Chrono {
  constructor(circuit, duree = 600) {
    this.c = circuit;
    this.duree = duree;
    this.tourCourant = 0;
    this.tours = 0;
    this.meilleur = null;
    this.meilleursSecteurs = [null, null, null];
    this.secteurs = [null, null, null];
    this.couleurs = ['', '', ''];
    this.secteur = 0;
    this.tDepart = 0;
    this.tSecteur = 0;
    this.temps = 0;
    this.delta = null;
    this.reference = null;
    this._ref = [];
    this._trace = [];
    this._sPrec = null;
    this._lance = false;
  }

  get restant() {
    return Math.max(this.duree - this.temps, 0);
  }

  pas(dt, s) {
    this.temps += dt;
    const L = this.c.longueur;
    if (this._sPrec === null) {
      this._sPrec = s;
      return null;
    }
    const franchi = (seuil) => this._sPrec < seuil && s >= seuil && s - this._sPrec < L / 2;
    let evenement = null;

    if (this._lance) {
      this.tourCourant += dt;
      this._trace.push([s, this.tourCourant]);
      if (this.reference) {
        const i = Math.min(Math.floor((s / L) * this.reference.length), this.reference.length - 1);
        this.delta = this.tourCourant - this.reference[i];
      }
      for (let k = 0; k < 2; k++) {
        if (franchi(this.c.secteurs[k])) this._finSecteur(k);
      }
    }
    // Passage de la ligne : le tour franchit s = 0.
    if (this._sPrec > L * 0.7 && s < L * 0.3) {
      if (this._lance) {
        this._finSecteur(2);
        const t = this.tourCourant;
        this.tours++;
        if (this.meilleur === null || t < this.meilleur) {
          this.meilleur = t;
          this.reference = this._construireRef();
          evenement = { type: 'record', temps: t };
        } else evenement = { type: 'tour', temps: t };
      } else {
        this._lance = true;
      }
      this.tourCourant = 0;
      this._trace = [];
      this.secteur = 0;
      this.delta = null;
      this.secteurs = [null, null, null];
      this.couleurs = ['', '', ''];
    }
    this._sPrec = s;
    return evenement;
  }

  _finSecteur(k) {
    const debut = k === 0 ? 0 : this.secteurs.slice(0, k).reduce((a, b) => a + (b || 0), 0);
    const t = this.tourCourant - debut;
    this.secteurs[k] = t;
    const m = this.meilleursSecteurs[k];
    if (m === null || t < m) {
      this.meilleursSecteurs[k] = t;
      this.couleurs[k] = 'record';
    } else this.couleurs[k] = t < m * 1.004 ? 'bon' : 'lent';
    this.secteur = k + 1;
  }

  _construireRef() {
    const n = 220;
    const L = this.c.longueur;
    const ref = new Float32Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const s = (i / n) * L;
      while (j < this._trace.length - 1 && this._trace[j][0] < s) j++;
      ref[i] = this._trace[j] ? this._trace[j][1] : 0;
    }
    return ref;
  }
}
