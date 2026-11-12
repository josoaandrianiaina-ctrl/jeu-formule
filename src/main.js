// Menu, réglages, lancement de la partie.

import { Jeu } from './jeu.js';
import { LIVREES } from './rendu/voiture.js';

const q = (s) => document.querySelector(s);
const choix = { circuit: 'foret-noire', livree: 0, direction: 'tactile' };
let jeu = null;

function groupe(id, cle, apres) {
  const el = q(id);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const autre of el.querySelectorAll('button')) autre.setAttribute('aria-pressed', String(autre === b));
    choix[cle] = b.dataset.v;
    if (apres) apres(b.dataset.v);
  });
}

// Livrées.
const elLivree = q('#choix-livree');
elLivree.innerHTML = LIVREES.map(
  (l, i) =>
    `<button data-v="${i}" aria-pressed="${i === 0}"><b><span class="pastille" style="background:#${l.corps
      .toString(16)
      .padStart(6, '0')}"></span>${l.nom}</b><small>Accent ${
      ['chaud', 'glacé', 'crème', 'braise'][i]
    }</small></button>`,
).join('');
groupe('#choix-circuit', 'circuit');
groupe('#choix-livree', 'livree');

let inclinaisonPrete = false;
groupe('#choix-direction', 'direction', async (v) => {
  const etat = q('#etat-inclinaison');
  const reglage = q('#reglage-inclinaison');
  if (v !== 'inclinaison') {
    etat.textContent = '';
    reglage.hidden = true;
    return;
  }
  reglage.hidden = false;
  if (!window.isSecureContext) {
    etat.textContent = "Page non sécurisée : l'inclinaison est bloquée. Reste au doigt.";
    return;
  }
  etat.textContent = 'Autorisation demandée…';
  const r = await demanderInclinaison();
  etat.textContent = r.ok
    ? 'Capteur actif. Tiens le téléphone comme un volant, puis lance la partie.'
    : r.raison + ' La direction au doigt reste disponible.';
  inclinaisonPrete = r.ok;
});

// L'autorisation doit partir d'un geste : on la demande ici, avant la partie.
async function demanderInclinaison() {
  const D = window.DeviceMotionEvent;
  if (!D) return { ok: false, raison: "Ce navigateur n'expose pas l'inclinaison." };
  try {
    if (typeof D.requestPermission === 'function') {
      const r = await D.requestPermission();
      if (r !== 'granted') return { ok: false, raison: 'Autorisation refusée.' };
    }
  } catch {
    return { ok: false, raison: "L'autorisation a échoué." };
  }
  return new Promise((res) => {
    let recu = false;
    const ecoute = (e) => {
      const a = e.accelerationIncludingGravity;
      if (a && (a.x !== null || a.y !== null)) recu = true;
    };
    addEventListener('devicemotion', ecoute);
    setTimeout(() => {
      removeEventListener('devicemotion', ecoute);
      res(recu ? { ok: true } : { ok: false, raison: 'Aucune donnée reçue du capteur.' });
    }, 500);
  });
}

q('#jouer').addEventListener('click', async () => {
  const b = q('#jouer');
  b.disabled = true;
  b.textContent = 'Construction du circuit…';
  try {
    jeu = new Jeu({ circuit: choix.circuit, livree: +choix.livree, duree: 600 });
    await jeu.demarrer();
    if (choix.direction === 'inclinaison' && inclinaisonPrete) {
      const r = await jeu.entrees.activerInclinaison();
      if (!r.ok) jeu.ath.message('Inclinaison indisponible · direction au doigt', 3.4);
      jeu.entrees.sensibilite = +q('#sensibilite').value;
      jeu.entrees.inverser = q('#inverser').checked;
    }
    q('#menu').classList.add('cache');
    q('#ath').classList.add('on');
  } catch (e) {
    b.disabled = false;
    b.textContent = 'Prendre la piste';
    q('#etat-inclinaison').textContent = 'Échec : ' + e.message;
    throw e;
  }
});

q('#btn-camera').addEventListener('click', () => {
  if (!jeu) return;
  const c = jeu.changerCamera();
  jeu.ath.message(c === 'cockpit' ? 'Vue cockpit' : 'Vue arrière', 1.5);
});

q('#btn-pause').addEventListener('click', () => {
  if (!jeu) return;
  jeu.pause = true;
  q('#pause-menu').classList.remove('cache');
});
q('#reprendre').addEventListener('click', () => {
  q('#pause-menu').classList.add('cache');
  if (jeu) {
    jeu.pause = false;
    jeu._tPrec = performance.now() / 1000;
  }
});
q('#replacer').addEventListener('click', () => {
  q('#pause-menu').classList.add('cache');
  if (jeu) {
    jeu.replacer();
    jeu.pause = false;
    jeu._tPrec = performance.now() / 1000;
  }
});
q('#quitter').addEventListener('click', () => location.reload());

addEventListener('visibilitychange', () => {
  if (document.hidden && jeu && !jeu.pause) {
    jeu.pause = true;
    q('#pause-menu').classList.remove('cache');
  }
});
