// Véhicule : docs/PHYSIQUE.md.
// Rapier intègre le châssis et détecte les contacts. Les forces de suspension,
// de pneu, de moteur, de frein et d'aérodynamique sont calculées ici.

import { G, VOITURE } from '../config.js';
import { clamp, cross, dot, tourner, unite } from '../util/maths.js';
import { adherence, forcesPneu } from './pneu.js';

export const GROUPE = { sol: 0x0001, mur: 0x0002, voiture: 0x0004 };
const HAUT_ANCRAGE = 0.3;
const N_SOUS_PAS = 6;

export class Vehicule {
  constructor(RAPIER, monde, options = {}) {
    this.R = RAPIER;
    this.monde = monde;
    const P = (this.P = { ...VOITURE, ...(options.params || {}) });
    const aAv = P.empattement * (1 - P.repAvant);
    const aAr = P.empattement * P.repAvant;
    this.aAv = aAv;
    this.aAr = aAr;
    const yRoue = P.rayonRoue - P.hCdg;
    const def = [
      { x: -P.voieAv / 2, z: -aAv, avant: true },
      { x: P.voieAv / 2, z: -aAv, avant: true },
      { x: -P.voieAr / 2, z: aAr, avant: false },
      { x: P.voieAr / 2, z: aAr, avant: false },
    ];
    this.roues = def.map((d) => {
      const k = d.avant ? P.kAv : P.kAr;
      const FzStat = (P.masse * G * (d.avant ? P.repAvant : 1 - P.repAvant)) / 2;
      const compStat = FzStat / k;
      return {
        ...d,
        k,
        FzStat,
        compStat,
        ancrage: [d.x, yRoue + HAUT_ANCRAGE, d.z],
        longLibre: HAUT_ANCRAGE + compStat,
        comp: compStat,
        contact: false,
        w: 0,
        Fz: FzStat,
        kappa: 0,
        tanAlpha: 0,
        fx: 0,
        fy: 0,
        absFacteur: 1,
        indice: -1,
        surface: 1,
        point: [0, 0, 0],
      };
    });
    const r1 = (P.regimeMax * 2 * Math.PI) / 60 / (P.vMaxRapport1 / P.rayonRoue);
    const r8 = (P.regimeMax * 2 * Math.PI) / 60 / (P.vMaxRapport8 / P.rayonRoue);
    const raison = (r8 / r1) ** (1 / (P.nbRapports - 1));
    this.rapports = Array.from({ length: P.nbRapports }, (_, i) => r1 * raison ** i);

    const pos = options.position || { x: 0, y: P.hCdg + 0.02, z: 0 };
    const rot = options.rotation || { x: 0, y: 0, z: 0, w: 1 };
    const corps = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation(rot)
      .setCanSleep(false)
      .setCcdEnabled(true)
      .setAdditionalMassProperties(
        P.masse,
        { x: 0, y: 0, z: 0 },
        { x: P.inertieTangage, y: P.inertieLacet, z: P.inertieRoulis },
        { x: 0, y: 0, z: 0, w: 1 },
      );
    this.corps = monde.createRigidBody(corps);
    const coll = RAPIER.ColliderDesc.cuboid(0.95, 0.19, 2.65)
      .setTranslation(0, 0.04, 0.15)
      .setDensity(0)
      .setFriction(0.25)
      .setRestitution(0.12)
      .setCollisionGroups((GROUPE.voiture << 16) | GROUPE.sol | GROUPE.mur | GROUPE.voiture);
    this.collisionneur = monde.createCollider(coll, this.corps);
    this.groupesRayon = (0xffff << 16) | GROUPE.sol;

    this.braquage = 0;
    this.rapport = 1;
    this.tempsRapport = 0;
    this.tcCoupe = 0;
    this.limitePuissance = 1;
    this.tel = { vitesse: 0, vLong: 0, regime: P.regimeRalenti, rapport: 1, coupe: 0, drs: false, aLong: 0 };
    this._vPrec = 0;
    this._f = [0, 0];
    this._f2 = [0, 0];
  }

  placer(pos, rot) {
    this.corps.setTranslation(pos, true);
    this.corps.setRotation(rot, true);
    this.corps.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.corps.setAngvel({ x: 0, y: 0, z: 0 }, true);
    for (const r of this.roues) {
      r.w = 0;
      r.comp = r.compStat;
      r.kappa = 0;
      r.indice = -1;
      r.absFacteur = 1;
    }
    this.braquage = 0;
    this.rapport = 1;
    this.tcCoupe = 0;
    this._vPrec = 0;
  }

  // Calcule et applique toutes les forces pour un pas de temps dt.
  // cmd : { gaz 0..1, frein 0..1, volant -1..1, drs, abs, antipatinage, pointMort }
  // adherenceSol(roue, x, z) : facteur d'adhérence du sol sous la roue (1 sur la piste).
  pas(dt, cmd, adherenceSol = null) {
    const P = this.P;
    const R = this.R;
    const corps = this.corps;
    // Les forces sont intégrées par Rapier sur ses sous-pas, comme la gravité.
    corps.resetForces(false);
    corps.resetTorques(false);
    const t = corps.translation();
    const q = corps.rotation();
    const lv = corps.linvel();
    const av = corps.angvel();
    const haut = tourner(q, [0, 1, 0]);
    const avant = tourner(q, [0, 0, -1]);
    const droite = tourner(q, [1, 0, 0]);
    const v = [lv.x, lv.y, lv.z];
    const om = [av.x, av.y, av.z];
    const vLong = dot(v, avant);
    const vitesse = Math.hypot(v[0], v[1], v[2]);
    const drs = !!cmd.drs;

    // Direction : l'angle maximal diminue avec la vitesse.
    const aLatMax = 0.8 * P.mu0 * G + ((0.5 * P.rho * P.CzA) / P.masse) * vitesse * vitesse;
    const braqMax = clamp((1.7 * P.empattement * aLatMax) / Math.max(vitesse * vitesse, 36), 0.02, P.braquageMax);
    const cible = clamp(cmd.volant || 0, -1, 1) * braqMax;
    this.braquage += clamp(cible - this.braquage, -P.vitBraquage * dt, P.vitBraquage * dt);
    const cb = Math.cos(this.braquage);
    const sb = Math.sin(this.braquage);

    // Moteur et boîte.
    const rg = this.roues[2];
    const rd = this.roues[3];
    const wArr = (rg.w + rd.w) / 2;
    this.tempsRapport -= dt;
    let regime = (Math.abs(wArr) * this.rapports[this.rapport - 1] * 60) / (2 * Math.PI);
    if (this.tempsRapport <= 0) {
      if (regime > P.regimeMontee && this.rapport < P.nbRapports) {
        this.rapport++;
        this.tempsRapport = 0.15;
      } else if (regime < P.regimeDescente && this.rapport > 1) {
        this.rapport--;
        this.tempsRapport = 0.15;
      }
    }
    const rapport = this.rapports[this.rapport - 1];
    regime = (Math.abs(wArr) * rapport * 60) / (2 * Math.PI);
    const wMot = (Math.max(regime, P.regimeRalenti) * 2 * Math.PI) / 60;
    let coupleMoteur = regime > P.regimeMax ? 0 : Math.min(P.coupleMax, P.puissance / wMot);

    // Antipatinage : plafond de couple selon l'adhérence des roues arrière,
    // puis réduction progressive si le glissement dépasse le seuil.
    const gaz = clamp(cmd.gaz || 0, 0, 1);
    let coupleEssieu = coupleMoteur * rapport * P.rendement * gaz * this.limitePuissance;
    let coupe = 0;
    if (cmd.antipatinage !== false) {
      // Capacité longitudinale restante, cercle d'adhérence : ce qui n'est pas
      // déjà pris par la force latérale ne peut pas servir à accélérer.
      let capacite = 0;
      for (const r of [rg, rd]) {
        const max = adherence(r.Fz, P) * r.Fz * r.surface;
        capacite += Math.sqrt(Math.max(max * max - r.fy * r.fy, 0.04 * max * max));
      }
      capacite *= P.rayonRoue;
      const glisse = (rg.kappa + rd.kappa) / 2 - P.tcSeuil;
      if (glisse > 0) this.tcCoupe = Math.min(0.95, this.tcCoupe + (P.tcMontee + P.tcGain * glisse) * dt);
      else this.tcCoupe = Math.max(0, this.tcCoupe - P.tcDescente * dt);
      const plafond = capacite * P.tcMarge * (1 - this.tcCoupe);
      if (coupleEssieu > plafond) {
        coupe = 1 - plafond / coupleEssieu;
        coupleEssieu = plafond;
      }
    } else this.tcCoupe = 0;
    if (cmd.pointMort) coupleEssieu = 0;
    else if (gaz < 0.02) coupleEssieu = -P.freinMoteur * rapport * Math.min(regime / P.regimeMax, 1) * Math.sign(wArr);
    const couplage = clamp(P.kDiff * (rg.w - rd.w), -600, 600);

    const frein = clamp(cmd.frein || 0, 0, 1);
    const dtSous = dt / N_SOUS_PAS;
    const origine = { x: 0, y: 0, z: 0 };
    const direction = { x: -haut[0], y: -haut[1], z: -haut[2] };

    for (let i = 0; i < 4; i++) {
      const r = this.roues[i];
      const a = tourner(q, r.ancrage);
      origine.x = t.x + a[0];
      origine.y = t.y + a[1];
      origine.z = t.z + a[2];
      const rayon = new R.Ray(origine, direction);
      const longMax = r.longLibre + P.rayonRoue;
      const touche = this.monde.castRayAndGetNormal(
        rayon,
        longMax,
        true,
        undefined,
        this.groupesRayon,
        undefined,
        corps,
      );
      let n = haut;
      if (touche) {
        const toi = touche.timeOfImpact ?? touche.toi;
        const comp = r.longLibre - (toi - P.rayonRoue);
        r.comp = comp;
        r.contact = true;
        n = [touche.normal.x, touche.normal.y, touche.normal.z];
        r.point[0] = origine.x + direction.x * toi;
        r.point[1] = origine.y + direction.y * toi;
        r.point[2] = origine.z + direction.z * toi;
      } else {
        r.contact = false;
        r.comp = 0;
        r.Fz = 0;
      }

      // Couples appliqués à la roue.
      let coupleMot = 0;
      if (!r.avant) coupleMot = coupleEssieu / 2 + (i === 2 ? -couplage : couplage);
      let coupleFrein = (frein * P.coupleFreinMax * (r.avant ? P.repFreinAv : 1 - P.repFreinAv)) / 2;
      // ABS : module le couple de frein d'une roue dont le glissement dépasse le seuil.
      if (cmd.abs !== false && frein > 0.05) {
        if (r.kappa < -P.absSeuil) r.absFacteur = Math.max(0.05, r.absFacteur - P.absRelachement * dt);
        else if (r.kappa > -P.absReprise) r.absFacteur = Math.min(1, r.absFacteur + P.absRetablissement * dt);
        coupleFrein *= r.absFacteur;
      } else r.absFacteur = 1;

      if (!r.contact) {
        // Roue en l'air : seuls les couples agissent.
        let w = r.w + (dt * coupleMot) / P.inertieRoue;
        const dw = (dt * coupleFrein) / P.inertieRoue;
        w = Math.abs(w) <= dw ? 0 : w - Math.sign(w) * dw;
        r.w = w;
        r.kappa = 0;
        r.fx = r.fy = 0;
        continue;
      }

      // Suspension. La vitesse de compression vient de la vitesse du châssis
      // au point d'ancrage : une différence finie sur la course oscille.
      const brasA = [origine.x - t.x, origine.y - t.y, origine.z - t.z];
      const vrA = cross(om, brasA);
      const vA = [v[0] + vrA[0], v[1] + vrA[1], v[2] + vrA[2]];
      const cosN = Math.min(dot([direction.x, direction.y, direction.z], n), -0.3);
      const vComp = dot(vA, n) / cosN;
      let Fs = r.k * r.comp + P.amort * clamp(vComp, -4, 4);
      const butee = r.compStat + P.debattement;
      if (r.comp > butee) Fs += P.rigButee * r.k * (r.comp - butee);
      Fs = clamp(Fs, 0, P.FsMax);
      r.Fz = Fs;

      // Repère du pneu sur le sol.
      let f = r.avant
        ? [avant[0] * cb + droite[0] * sb, avant[1] * cb + droite[1] * sb, avant[2] * cb + droite[2] * sb]
        : avant;
      const fn = dot(f, n);
      f = unite([f[0] - n[0] * fn, f[1] - n[1] * fn, f[2] - n[2] * fn]);
      const lat = cross(f, n);
      // Vitesse du point de contact.
      const bras = [r.point[0] - t.x, r.point[1] - t.y, r.point[2] - t.z];
      const vr = cross(om, bras);
      const vc = [v[0] + vr[0], v[1] + vr[1], v[2] + vr[2]];
      const vx = dot(vc, f);
      const vy = dot(vc, lat);
      const den = Math.max(Math.abs(vx), P.vMinGliss);
      // Dérive calculée avec un plancher de vitesse plus haut : évite une oscillation en lacet à l'arrêt.
      const tanAlpha = vy / Math.max(Math.abs(vx), P.vMinDerive);
      r.surface = adherenceSol ? adherenceSol(r, r.point[0], r.point[2]) : 1;
      const mu = adherence(Fs, P) * r.surface;
      const coupleRoul = P.crr * Fs * P.rayonRoue;

      // Rotation de la roue, intégrée en sous-pas avec un schéma semi-implicite.
      let w = r.w;
      let sx = 0;
      let sy = 0;
      let kappa = 0;
      const eps = 0.002;
      for (let s = 0; s < N_SOUS_PAS; s++) {
        kappa = (w * P.rayonRoue - vx) / den;
        forcesPneu(kappa, tanAlpha, Fs, mu, P, this._f);
        forcesPneu(kappa + eps, tanAlpha, Fs, mu, P, this._f2);
        const dFdw = Math.max(((this._f2[0] - this._f[0]) / eps) * (P.rayonRoue / den), 0);
        let wn =
          w +
          (dtSous * (coupleMot - this._f[0] * P.rayonRoue)) /
            P.inertieRoue /
            (1 + (dtSous * P.rayonRoue * dFdw) / P.inertieRoue);
        const dw = (dtSous * (coupleFrein + coupleRoul)) / P.inertieRoue;
        wn = Math.abs(wn) <= dw ? 0 : wn - Math.sign(wn) * dw;
        w = wn;
        sx += this._f[0];
        sy += this._f[1];
      }
      r.w = w;
      r.kappa = kappa;
      r.tanAlpha = tanAlpha;
      r.fx = sx / N_SOUS_PAS;
      r.fy = sy / N_SOUS_PAS;

      // Application des forces au point de contact.
      const Fx = r.fx;
      const Fy = r.fy;
      const force = {
        x: n[0] * Fs + f[0] * Fx + lat[0] * Fy,
        y: n[1] * Fs + f[1] * Fx + lat[1] * Fy,
        z: n[2] * Fs + f[2] * Fx + lat[2] * Fy,
      };
      corps.addForceAtPoint(force, { x: r.point[0], y: r.point[1], z: r.point[2] }, true);
    }

    // Aérodynamique.
    const q2 = 0.5 * P.rho * vLong * vLong * (vLong > 0 ? 1 : 0);
    const appui = q2 * (drs ? P.CzADrs : P.CzA);
    const zAero = P.repAeroAv * P.empattement - this.aAr;
    corps.addForceAtPoint(
      { x: -haut[0] * appui, y: -haut[1] * appui, z: -haut[2] * appui },
      { x: t.x + avant[0] * zAero, y: t.y + avant[1] * zAero, z: t.z + avant[2] * zAero },
      true,
    );
    const kT = 0.5 * P.rho * (drs ? P.CxADrs : P.CxA) * vitesse;
    corps.addForce({ x: -v[0] * kT, y: -v[1] * kT, z: -v[2] * kT }, true);

    const tel = this.tel;
    tel.aLong = (vLong - this._vPrec) / dt;
    this._vPrec = vLong;
    tel.vitesse = vitesse;
    tel.vLong = vLong;
    tel.regime = Math.max(regime, P.regimeRalenti);
    tel.rapport = this.rapport;
    tel.coupe = coupe;
    tel.drs = drs;
    tel.appui = appui;
  }
}
