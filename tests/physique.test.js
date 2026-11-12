// Scénarios de validation de docs/PHYSIQUE.md, section 5.
// Chaque référence est calculée à partir des mêmes paramètres, pas copiée d'un résultat.

import { describe, it, expect, beforeAll } from 'vitest';
import { init, banc, simuler, stabiliser, PAS, G } from './banc.js';
import { VOITURE as P } from '../src/config.js';
import { adherence, forcesPneu, courbe } from '../src/physique/pneu.js';
import { tourner } from '../src/util/maths.js';

const kmh = (v) => v / 3.6;

beforeAll(async () => {
  await init();
}, 60000);

describe('pneu', () => {
  it('ne dépasse jamais mu·Fz, seul ou en combiné (V8)', () => {
    const Fz = 3000;
    const mu = adherence(Fz);
    for (const k of [-0.6, -0.1, 0, 0.1, 0.6]) {
      for (const a of [-0.8, -0.12, 0, 0.12, 0.8]) {
        const [fx, fy] = forcesPneu(k, a, Fz, mu);
        expect(Math.hypot(fx, fy)).toBeLessThanOrEqual(mu * Fz * 1.0001);
      }
    }
  });

  it('atteint son maximum au glissement de pic', () => {
    expect(courbe(1)).toBeCloseTo(1, 3);
    expect(courbe(0.5)).toBeLessThan(1);
    expect(courbe(3)).toBeLessThan(1);
    expect(courbe(3)).toBeGreaterThan(0.75);
  });

  it("l'adhérence décroît quand la charge augmente", () => {
    expect(adherence(4000)).toBeLessThan(adherence(2000));
  });
});

describe('V1 — voiture au repos', () => {
  it('porte le poids selon la répartition, et reste immobile', () => {
    const b = banc();
    simuler(b, 4, { gaz: 0, frein: 0, volant: 0 });
    const attendu = [
      (P.masse * G * P.repAvant) / 2,
      (P.masse * G * P.repAvant) / 2,
      (P.masse * G * (1 - P.repAvant)) / 2,
      (P.masse * G * (1 - P.repAvant)) / 2,
    ];
    b.v.roues.forEach((r, i) => {
      expect(Math.abs(r.Fz - attendu[i]) / attendu[i]).toBeLessThan(0.02);
      expect(Math.abs(r.comp - attendu[i] / r.k)).toBeLessThan(0.05 * (attendu[i] / r.k));
    });
    expect(b.v.tel.vitesse).toBeLessThan(0.01);
    const lv = b.v.corps.linvel();
    expect(Math.abs(lv.y)).toBeLessThan(0.01);
  }, 30000);
});

describe('V3 — vitesse maximale', () => {
  it("s'équilibre là où la puissance compense la traînée", () => {
    const b = banc();
    simuler(b, 75, { gaz: 1, frein: 0, volant: 0 });
    const v = b.v.tel.vitesse;
    // P·rendement = ½ρ·Cx·A·v³ + crr·(mg + appui)·v
    const f = (x) =>
      0.5 * P.rho * P.CxA * x ** 3 + P.crr * (P.masse * G + 0.5 * P.rho * P.CzA * x * x) * x - P.puissance * P.rendement;
    let lo = 50;
    let hi = 120;
    for (let i = 0; i < 60; i++) {
      const m = (lo + hi) / 2;
      if (f(m) > 0) hi = m;
      else lo = m;
    }
    expect(Math.abs(v - lo) / lo).toBeLessThan(0.03);
  }, 60000);
});

describe('V2 — accélération', () => {
  it('suit un modèle longitudinal à adhérence puis puissance limitée', () => {
    const b = banc();
    const jalons = {};
    simuler(b, 25, { gaz: 1, frein: 0, volant: 0 }, (v, t) => {
      for (const j of [100, 200, 300]) if (jalons[j] === undefined && v.tel.vitesse >= kmh(j)) jalons[j] = t;
    });
    // Référence : intégration 1D avec transfert de charge et appui.
    const ref = {};
    let v = 0;
    let t = 0;
    const dt = 5e-4;
    while (v < kmh(300) && t < 60) {
      const q = 0.5 * P.rho * v * v;
      const D = q * P.CzA;
      const T = q * P.CxA;
      let a = 5;
      for (let k = 0; k < 24; k++) {
        const FzR = (P.masse * G * (1 - P.repAvant) + D * (1 - P.repAeroAv) + (P.masse * a * P.hCdg) / P.empattement) / 2;
        const Ft = Math.min(2 * adherence(FzR) * FzR, v > 1 ? (P.puissance * P.rendement) / v : 1e9);
        a = (Ft - T - P.crr * (P.masse * G + D)) / P.masse;
      }
      v += a * dt;
      t += dt;
      for (const j of [100, 200, 300]) if (ref[j] === undefined && v >= kmh(j)) ref[j] = t;
    }
    for (const j of [100, 200, 300]) {
      expect(jalons[j]).toBeDefined();
      // L'antipatinage garde une marge de glissement : la voiture reste un peu
      // en retrait de l'optimum théorique, jamais devant.
      expect(jalons[j]).toBeGreaterThan(ref[j] * 0.97);
      expect(jalons[j]).toBeLessThan(ref[j] * 1.25);
    }
  }, 90000);
});

describe('V4 — freinage 300 → 100 km/h', () => {
  it("s'arrête dans la distance permise par l'adhérence, sans roue bloquée", () => {
    const b = banc();
    simuler(b, 30, { gaz: 1, frein: 0, volant: 0 }, (v) => v.tel.vitesse < kmh(305));
    let z300 = null;
    let z100 = null;
    let bloque = 0;
    simuler(b, 10, { gaz: 0, frein: 1, volant: 0 }, (v) => {
      const z = v.corps.translation().z;
      if (z300 === null && v.tel.vitesse <= kmh(300)) z300 = z;
      if (z300 !== null && v.tel.vitesse > kmh(30) && v.roues.some((r) => r.kappa < -0.45)) bloque++;
      if (z100 === null && v.tel.vitesse <= kmh(100)) {
        z100 = z;
        return false;
      }
    });
    expect(z100).not.toBeNull();
    const distance = Math.abs(z300 - z100);
    // Référence : intégration 1D de la décélération disponible.
    let v = kmh(300);
    let d = 0;
    const dt = 5e-4;
    while (v > kmh(100)) {
      const q = 0.5 * P.rho * v * v;
      const D = q * P.CzA;
      const Fz = (P.masse * G + D) / 4;
      const a = (4 * adherence(Fz) * Fz + q * P.CxA + P.crr * (P.masse * G + D)) / P.masse;
      v -= a * dt;
      d += v * dt;
    }
    expect(Math.abs(distance - d) / d).toBeLessThan(0.22);
    expect(bloque).toBe(0);
  }, 90000);
});

describe('V5 — transfert de charge longitudinal', () => {
  it('correspond à m·a·h/L au freinage', () => {
    const b = banc();
    simuler(b, 20, { gaz: 1, frein: 0, volant: 0 }, (v) => v.tel.vitesse < kmh(150));
    let n = 0;
    let somme = 0;
    let aMoy = 0;
    simuler(b, 1.2, { gaz: 0, frein: 0.55, volant: 0 }, (v, t) => {
      if (t < 0.4) return;
      const q = 0.5 * P.rho * v.tel.vLong ** 2 * P.CzA;
      const avRef = P.masse * G * P.repAvant + q * P.repAeroAv;
      const arRef = P.masse * G * (1 - P.repAvant) + q * (1 - P.repAeroAv);
      const av = v.roues[0].Fz + v.roues[1].Fz;
      const ar = v.roues[2].Fz + v.roues[3].Fz;
      // Le transfert est ce que l'avant gagne et que l'arrière perd.
      somme += (av - avRef - (ar - arRef)) / 2;
      aMoy += v.tel.aLong;
      n++;
    });
    const mesure = somme / n;
    const theorie = (P.masse * Math.abs(aMoy / n) * P.hCdg) / P.empattement;
    expect(mesure).toBeGreaterThan(0);
    expect(Math.abs(mesure - theorie) / theorie).toBeLessThan(0.15);
  }, 60000);
});

describe('V7 — virage stabilisé', () => {
  it("l'accélération latérale maximale suit mu·(mg + appui)/m", () => {
    for (const [R, vCible] of [
      [150, kmh(190)],
      [67, kmh(125)],
    ]) {
      const b = banc();
      simuler(b, 30, { gaz: 1, frein: 0, volant: 0 }, (v) => v.tel.vitesse < vCible);
      let vol = 0;
      let somme = 0;
      let n = 0;
      let vSomme = 0;
      simuler(
        b,
        16,
        (v) => {
          const av = v.corps.angvel();
          const lv = v.corps.linvel();
          const sp = Math.hypot(lv.x, lv.z);
          vol = Math.max(0, Math.min(1, vol + (sp / R - Math.abs(av.y)) * 0.6));
          return { gaz: Math.max(0, Math.min(1, (vCible - sp) * 0.6 + 0.1)), frein: 0, volant: vol };
        },
        (v, t) => {
          if (t < 9) return;
          const av = v.corps.angvel();
          const lv = v.corps.linvel();
          const sp = Math.hypot(lv.x, lv.z);
          somme += sp * Math.abs(av.y);
          vSomme += sp;
          n++;
        },
      );
      const aMes = somme / n;
      const vMoy = vSomme / n;
      // La vitesse visée doit être tenue, sinon la mesure ne dit rien.
      expect(vMoy).toBeGreaterThan(vCible * 0.9);
      const appui = 0.5 * P.rho * vMoy * vMoy * P.CzA;
      const aMax = (adherence((P.masse * G + appui) / 4) * (P.masse * G + appui)) / P.masse;
      expect(aMes).toBeGreaterThan((vMoy * vMoy) / R * 0.9);
      expect(aMes).toBeLessThan(aMax * 1.05);
      expect(b.v.roues.every((r) => Math.abs(r.tanAlpha) < Math.tan(P.alphaPic) * 1.6)).toBe(true);
    }
  }, 120000);
});

describe('V9 — pente', () => {
  it('accélère en descente et ralentit en montée, selon la composante de g', () => {
    const resultats = [];
    for (const deg of [-5, 5]) {
      const theta = (deg * Math.PI) / 180;
      const b = banc(theta);
      simuler(b, 2.5, { gaz: 0, frein: 0, volant: 0 });
      simuler(b, 8, { gaz: 0.42, frein: 0, volant: 0 }, (v) => v.tel.vitesse < 22);
      let a = 0;
      let vSomme = 0;
      let fy = 0;
      let n = 0;
      simuler(b, 2.4, { gaz: 0, frein: 0, volant: 0, pointMort: true }, (v, t) => {
        if (t < 0.5) return;
        a += v.tel.aLong;
        vSomme += v.tel.vLong;
        fy += tourner(v.corps.rotation(), [0, 0, -1])[1];
        n++;
      });
      const mesure = a / n;
      const vMoy = vSomme / n;
      const pente = fy / n; // composante verticale de l'axe avant : <0 en descente
      const theorie =
        -G * pente - (0.5 * P.rho * P.CxA * vMoy * vMoy) / P.masse - P.crr * G * Math.sqrt(1 - pente * pente);
      resultats.push({ pente, mesure, theorie });
      expect(Math.abs(mesure - theorie)).toBeLessThan(Math.abs(theorie) * 0.2 + 0.25);
    }
    // Les deux essais sont bien l'un en montée et l'autre en descente.
    expect(Math.sign(resultats[0].pente)).toBe(-Math.sign(resultats[1].pente));
    const descente = resultats.find((r) => r.pente < 0);
    const montee = resultats.find((r) => r.pente > 0);
    expect(descente.mesure).toBeGreaterThan(montee.mesure);
    expect(montee.mesure).toBeLessThan(0);
  }, 90000);
});

describe('V11 — stabilité', () => {
  it('reste fini et sans énergie divergente sur une longue course', () => {
    const b = banc();
    let eMax = 0;
    simuler(b, 90, (v, t) => ({ gaz: 1, frein: 0, volant: 0.35 * Math.sin(t * 0.7) }), (v) => {
      const lv = v.corps.linvel();
      const av = v.corps.angvel();
      const e = 0.5 * P.masse * (lv.x ** 2 + lv.y ** 2 + lv.z ** 2);
      eMax = Math.max(eMax, e);
      expect(Number.isFinite(e)).toBe(true);
      expect(Number.isFinite(av.y)).toBe(true);
    });
    // Énergie cinétique bornée par la vitesse maximale atteignable.
    expect(eMax).toBeLessThan(0.5 * P.masse * 110 ** 2);
    expect(b.v.corps.translation().y).toBeGreaterThan(-5);
    expect(b.v.corps.translation().y).toBeLessThan(5);
  }, 120000);
});

describe('aides au pilotage', () => {
  it("l'ABS raccourcit la distance face à des freins non régulés", () => {
    const mesurer = (abs) => {
      const b = banc();
      simuler(b, 30, { gaz: 1, frein: 0, volant: 0 }, (v) => v.tel.vitesse < kmh(220));
      const z0 = b.v.corps.translation().z;
      let z1 = null;
      simuler(b, 12, { gaz: 0, frein: 1, volant: 0, abs }, (v) => {
        if (v.tel.vitesse <= kmh(60)) {
          z1 = v.corps.translation().z;
          return false;
        }
      });
      return z1 === null ? Infinity : Math.abs(z1 - z0);
    };
    expect(mesurer(true)).toBeLessThan(mesurer(false));
  }, 120000);

  it("l'antipatinage limite le glissement au départ", () => {
    const mesurer = (antipatinage) => {
      const b = banc();
      let k = 0;
      simuler(b, 3, { gaz: 1, frein: 0, volant: 0, antipatinage }, (v) => {
        k = Math.max(k, (v.roues[2].kappa + v.roues[3].kappa) / 2);
      });
      return k;
    };
    expect(mesurer(true)).toBeLessThan(mesurer(false));
    expect(mesurer(true)).toBeLessThan(0.45);
  }, 60000);
});
