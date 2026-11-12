// Générateur de circuits et chronométrage.

import { describe, it, expect, beforeAll } from 'vitest';
import { genererCircuit, STYLES, controler, localiser, surface, dansZoneDrs, LIMITES } from '../src/circuit/generateur.js';
import { profilVitesse } from '../src/circuit/profil.js';
import { poseDepart, demiLargeurTotale } from '../src/circuit/collisions.js';
import { Chrono } from '../src/ath.js';
import { init, RAPIER, PAS, G } from './banc.js';
import { creerCollisions } from '../src/circuit/collisions.js';
import { Vehicule } from '../src/physique/vehicule.js';
import { Pilote } from '../src/ia/pilote.js';
import { SURFACES } from '../src/config.js';

const styles = Object.keys(STYLES);

describe('générateur', () => {
  for (const cle of styles) {
    describe(cle, () => {
      const c = genererCircuit(STYLES[cle]);

      it('produit une boucle fermée et valide', () => {
        expect(controler(c, c.largeur)).toEqual([]);
        expect(c.longueur).toBeGreaterThan(LIMITES.longMin);
        expect(c.longueur).toBeLessThan(LIMITES.longMax);
      });

      it('est continu à la jonction en position, tangente, courbure et pente', () => {
        const N = c.n;
        const ecart = (cle2, a, b) => Math.abs(c[cle2][a] - c[cle2][b]);
        let maxPos = 0;
        let maxTan = 0;
        let maxCou = 0;
        let maxPen = 0;
        for (let i = 0; i < N - 1; i++) {
          maxPos = Math.max(maxPos, Math.hypot(c.x[i] - c.x[i + 1], c.y[i] - c.y[i + 1], c.z[i] - c.z[i + 1]));
          maxTan = Math.max(maxTan, Math.hypot(c.tx[i] - c.tx[i + 1], c.tz[i] - c.tz[i + 1]));
          maxCou = Math.max(maxCou, ecart('courbure', i, i + 1));
          maxPen = Math.max(maxPen, ecart('pente', i, i + 1));
        }
        expect(Math.hypot(c.x[N - 1] - c.x[0], c.y[N - 1] - c.y[0], c.z[N - 1] - c.z[0])).toBeLessThan(maxPos * 1.5);
        expect(Math.hypot(c.tx[N - 1] - c.tx[0], c.tz[N - 1] - c.tz[0])).toBeLessThan(maxTan * 1.5 + 1e-6);
        expect(ecart('courbure', N - 1, 0)).toBeLessThan(maxCou * 1.5 + 1e-6);
        expect(ecart('pente', N - 1, 0)).toBeLessThan(maxPen * 1.5 + 1e-6);
      });

      it('respecte le rayon minimal et la pente maximale', () => {
        let kMax = 0;
        let pMax = 0;
        for (let i = 0; i < c.n; i++) {
          kMax = Math.max(kMax, Math.abs(c.courbure[i]));
          pMax = Math.max(pMax, Math.abs(c.pente[i]));
        }
        expect(1 / kMax).toBeGreaterThanOrEqual(LIMITES.rayonMin);
        expect(pMax).toBeLessThanOrEqual(LIMITES.penteMax);
      });

      it('ne repasse jamais trop près de lui-même', () => {
        const sep = demiLargeurTotale(c) * 2 + 8;
        const saut = Math.ceil(140 / c.ds);
        for (let a = 0; a < c.n; a += 5) {
          for (let b = a + saut; b < c.n; b += 5) {
            if (c.n - (b - a) < saut) continue;
            expect(Math.hypot(c.x[a] - c.x[b], c.z[a] - c.z[b])).toBeGreaterThan(sep * 0.9);
          }
        }
      });

      it('donne le même circuit pour la même graine', () => {
        const d = genererCircuit(STYLES[cle]);
        expect(d.n).toBe(c.n);
        expect(d.longueur).toBeCloseTo(c.longueur, 6);
        for (let i = 0; i < c.n; i += 97) {
          expect(d.x[i]).toBe(c.x[i]);
          expect(d.y[i]).toBe(c.y[i]);
        }
      });

      it('place deux zones DRS séparées, et une ligne de départ en portion droite', () => {
        expect(c.zonesDrs).toHaveLength(2);
        expect(dansZoneDrs(c, 0)).toBe(true);
        let milieu = 0;
        for (let k = 0; k < 40; k++) milieu = Math.max(milieu, Math.abs(c.courbure[k]));
        expect(1 / milieu).toBeGreaterThan(180);
      });
    });
  }

  it('localise un point du centre de piste avec un écart nul', () => {
    const c = genererCircuit(STYLES[styles[0]]);
    for (const i of [0, 137, 904]) {
      const l = localiser(c, c.x[i], c.z[i]);
      expect(Math.abs(l.d)).toBeLessThan(0.05);
      expect(Math.abs(l.s - i * c.ds)).toBeLessThan(c.ds);
    }
  });

  it('nomme la surface selon la distance au centre', () => {
    const c = genererCircuit(STYLES[styles[0]]);
    expect(surface(c, 0)).toBe('piste');
    expect(surface(c, c.largeur / 2 + 0.5)).toBe('vibreur');
    expect(surface(c, c.largeur / 2 + 6)).toBe('herbe');
    expect(SURFACES.herbe).toBeLessThan(SURFACES.piste);
  });

  it('propose un profil de vitesse plus lent dans les virages serrés', () => {
    const c = genererCircuit(STYLES['foret-noire']);
    const p = profilVitesse(c);
    let iLent = 0;
    let iRapide = 0;
    for (let i = 0; i < c.n; i++) {
      if (p.vitesse[i] < p.vitesse[iLent]) iLent = i;
      if (p.vitesse[i] > p.vitesse[iRapide]) iRapide = i;
    }
    expect(Math.abs(c.courbure[iLent])).toBeGreaterThan(Math.abs(c.courbure[iRapide]));
    expect(p.vitesse[iLent]).toBeGreaterThan(20);
  });
});

describe('chronométrage', () => {
  const c = genererCircuit(STYLES['valmora']);

  it('ignore le tour de lancement, puis mesure tours et secteurs', () => {
    const ch = new Chrono(c, 600);
    const L = c.longueur;
    const dt = 1 / 60;
    const vitesse = L / 60; // un tour en 60 s
    let s = 0;
    const evenements = [];
    for (let i = 0; i < 60 * 60 * 3; i++) {
      s = (s + vitesse * dt) % L;
      const e = ch.pas(dt, s);
      if (e) evenements.push(e);
    }
    expect(ch.tours).toBe(2);
    expect(evenements[0].temps).toBeGreaterThan(59.5);
    expect(evenements[0].temps).toBeLessThan(60.5);
    expect(evenements[0].type).toBe('record');
    expect(ch.meilleur).toBeLessThan(60.5);
    expect(ch.meilleursSecteurs.every((x) => x > 15 && x < 25)).toBe(true);
  });

  it('retient le meilleur tour et calcule un écart', () => {
    const ch = new Chrono(c, 600);
    const L = c.longueur;
    const dt = 1 / 60;
    let s = 0;
    const tour = (duree, part = 1) => {
      const pas = (L / duree) * dt;
      for (let i = 0; i < Math.round((duree * part) / dt); i++) {
        s = (s + pas) % L;
        ch.pas(dt, s);
      }
    };
    tour(60);
    tour(60);
    expect(ch.meilleur).toBeLessThan(60.6);
    // Un tour plus lent : l'écart se lit en cours de tour, pas après la ligne.
    tour(70, 0.6);
    expect(ch.delta).not.toBeNull();
    expect(ch.delta).toBeGreaterThan(0);
    expect(ch.delta).toBeLessThan(12);
    tour(70, 0.4);
    expect(ch.meilleur).toBeLessThan(60.6);
    expect(ch.tours).toBe(2);
  });
});

describe('tour complet en simulation', () => {
  beforeAll(async () => {
    await init();
  }, 60000);

  for (const cle of styles) {
    it(`${cle} : le pilote automatique boucle deux tours sans quitter la piste`, async () => {
      const c = genererCircuit(STYLES[cle]);
      const profil = profilVitesse(c);
      const monde = new RAPIER.World({ x: 0, y: -G, z: 0 });
      monde.timestep = PAS;
      creerCollisions(RAPIER, monde, c);
      const v = new Vehicule(RAPIER, monde, poseDepart(c, 0, 0));
      monde.step();
      const pilote = new Pilote(c, profil, { rythme: 0.9 });
      const adher = (r, x, z) => {
        const l = localiser(c, x, z, r.indice);
        r.indice = l.i;
        return SURFACES[surface(c, l.d)];
      };
      const ch = new Chrono(c, 900);
      let t = 0;
      let ecartMax = 0;
      let horsPiste = 0;
      const temps = [];
      while (t < 420 && ch.tours < 2) {
        const cmd = pilote.commande(v);
        v.pas(PAS, cmd, adher);
        monde.step();
        t += PAS;
        const ev = ch.pas(PAS, cmd.loc.s);
        if (ev) temps.push(ev.temps);
        ecartMax = Math.max(ecartMax, Math.abs(cmd.loc.d));
        if (Math.abs(cmd.loc.d) > c.largeur / 2) horsPiste++;
        expect(Number.isFinite(v.corps.translation().x)).toBe(true);
      }
      expect(ch.tours).toBe(2);
      expect(horsPiste).toBe(0);
      expect(ecartMax).toBeLessThan(c.largeur / 2);
      expect(temps[0]).toBeGreaterThan(25);
      expect(Math.abs(temps[1] - temps[0])).toBeLessThan(temps[0] * 0.12);
      monde.free();
    }, 300000);
  }
});
