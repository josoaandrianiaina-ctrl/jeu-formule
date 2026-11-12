# Architecture technique

Projet : **Formula Racing Ultra 3D** — jeu de course de monoplaces en 3D pour mobile.

Statut : proposition de Claude, à vérifier par ChatGPT et à valider par Josoa.
Rien n'est encore construit. Ce document ne décrit aucun code existant.

---

## 1. Décision ouverte n°1 : le moteur

Le cahier des charges initial demande Unreal Engine 5. Il demande aussi du code
« réellement compilable » et interdit de « prétendre avoir testé sans test réel ».
Ces deux exigences se contredisent pour Claude : voir `RISQUES.md`, R1 à R4.

| | Option A — Three.js + Rapier (web) | Option B — Unreal Engine 5 |
|---|---|---|
| Claude peut compiler | Oui | Non |
| Claude peut tester | Oui : physique en tests automatiques, rendu en navigateur sans écran | Non : Josoa compile et rapporte les erreurs |
| Android | Oui, par le navigateur | Oui, avec Android Studio sur le PC de Josoa |
| iPhone | Oui, par le navigateur | Mac avec Xcode obligatoire pour un projet C++ |
| Installation côté Josoa | Aucune | Unreal, Visual Studio, Android Studio |
| Gyroscope | Oui, sur page HTTPS hors appli Claude | Oui |
| Niveau graphique atteignable | Propre et lisible, pas « console » | Élevé, mais dépend de modèles 3D d'artistes |
| Publication sur les stores | Non (possible plus tard par encapsulation) | Oui |

**Recommandation de Claude : option A.** C'est la seule où chaque ligne de code
est exécutée et testée avant d'arriver dans le dépôt.

Le reste de ce document décrit l'option A. Si l'option B est retenue, la
section 3 (systèmes) reste valable ; les sections 2 et 6 sont à réécrire.

---

## 2. Pile technique (option A)

| Rôle | Outil | Version vérifiée le 12/11/2026 |
|---|---|---|
| Rendu 3D | Three.js (WebGL) | 0.187.0 |
| Physique | Rapier 3D, paquet `@dimforge/rapier3d-compat` (WebAssembly) | 0.21.0 |
| Langage | TypeScript | à fixer à l'étape 1 |
| Assemblage | Vite | à fixer à l'étape 1 |
| Tests | Vitest (physique sous Node), Chrome sans écran (rendu) | à fixer à l'étape 1 |
| Hébergement | GitHub Pages, déployé par GitHub Actions | — |
| Modèles 3D | Générés par code au départ ; fichiers GLB (Blender) possibles ensuite | — |

Vérifié réellement : les deux versions ci-dessus sont celles publiées sur npm, et
Rapier 0.21.0 expose bien un contrôleur de véhicule (`createVehicleController`)
avec, par roue : suspension (raideur, compression, détente, débattement, force
maximale), force moteur, frein, braquage, adhérence longitudinale et latérale.

---

## 3. Systèmes

Chaque système vit dans son dossier, a ses propres tests, et ne dépend que du
noyau. Aucun système n'est « simulé par une animation ».

```
src/
  noyau/        boucle à pas fixe, état global, événements
  physique/     véhicule : châssis, roues, pneus, aéro, moteur, freins
  circuit/      spline 3D, maillage de piste, collisions, secteurs, stands
  voiture/      modèle 3D, roues et volant animés depuis la physique
  ia/           trajectoire, freinage, dépassement, niveaux de difficulté
  course/       sessions, règles, pénalités, pneus, stands, météo
  entrees/      tactile, gyroscope, clavier (tests sur PC)
  camera/       poursuite, cockpit
  ath/          affichage tête haute
  audio/        moteur et ambiance (Web Audio)
  sauvegarde/   records et réglages (stockage local du téléphone)
tests/
docs/
```

### 3.1 Noyau
- Physique à pas fixe (120 Hz visé), rendu à la fréquence de l'écran, interpolation entre les deux.
- La physique ne dépend jamais du rendu : elle tourne aussi sous Node pour les tests.

### 3.2 Physique du véhicule
| Élément | Méthode |
|---|---|
| Châssis | Corps rigide Rapier, masse et inertie réglables |
| Suspensions | Quatre rayons indépendants (contrôleur de véhicule Rapier) |
| Gravité et pentes | Gravité du monde physique ; aucun traitement spécial des montées et descentes |
| Transfert de masse | Résulte du corps rigide et des suspensions ; mesuré par les forces de suspension |
| Pneus | Adhérence dépendant de la charge, du glissement, de la température et de l'usure |
| Aérodynamique | Appui et traînée proportionnels au carré de la vitesse ; DRS = traînée réduite |
| Moteur et boîte | Courbe de couple, rapports, passage automatique |
| Freins | Répartition avant/arrière, ABS par limitation du glissement |
| Antipatinage | Limitation du couple selon le glissement des roues motrices |
| Collisions et dégâts | Contacts Rapier ; les dégâts modifient l'aéro, la direction ou la puissance |

Limite assumée : le modèle de pneu sera une approximation paramétrique, pas un
modèle de simulateur professionnel. Il sera documenté avec ses paramètres.

### 3.3 Circuits
- Trajectoire : spline 3D fermée (points X, Y, Z), avec largeur et dévers par section.
- Maillage de piste, vibreurs et zones de dégagement générés depuis la spline.
- Collision : maillage triangulé pour la piste, volumes simples pour barrières et murs.
- Données de course portées par la spline : ligne de départ, trois secteurs, zones DRS, voie des stands, trajectoire idéale et points de freinage.
- Générateur paramétrable (longueur, nombre de virages, dénivelé, graine aléatoire), puis éditeur.
- Décor : relief, tribunes, stands, barrières ; chargé selon la distance.

### 3.4 Voitures
- Monoplaces originales, sans marque ni écurie réelle.
- Première version : formes générées par code. Détail limité.
- Roues, suspensions et volant animés à partir de l'état physique.
- Livrées par couleurs paramétrables.

### 3.5 IA
- Suit la trajectoire idéale du circuit avec une vitesse cible par virage.
- Freinage anticipé, dépassement par décalage latéral, défense de position.
- Niveaux de difficulté : marge de vitesse, erreurs, agressivité.
- Les adversaires utilisent la même physique que le joueur.

### 3.6 Course
- Sessions : essais libres (10 minutes par circuit), qualifications, course, contre-la-montre avec fantôme.
- Pneus tendres, mediums, durs ; usure et température.
- Arrêts aux stands.
- Pénalités : ralentissement imposé de la voiture.
- Aspiration derrière un adversaire.
- Météo : sec ou pluie, adhérence modifiée.

### 3.7 Entrées, caméras, ATH
Voir section 4.

### 3.8 Performances mobiles
- Résolution dynamique, niveaux de détail, ombres selon l'appareil.
- Quatre profils : ultra, élevé, moyen, économie.
- Les fréquences d'image visées restent des objectifs tant qu'elles ne sont pas mesurées sur un téléphone réel.

---

## 4. Choix de conception déjà posés

**Demandés par Josoa**
- Deux caméras : vue arrière et cockpit à la première personne.
- Disposition de l'écran, téléphone en paysage :
  - haut gauche : tour en cours et classement ;
  - haut centre : rétroviseur ;
  - haut droite : position, chrono, meilleur tour ;
  - bas centre : écran du volant (rapport, vitesse) ;
  - côté droit : bouton d'accélération, bouton DRS au-dessus ;
  - côté gauche : zone de freinage.
- Pas de marche arrière.
- Direction par inclinaison du téléphone (gyroscope).
- DRS utilisable en ligne droite.
- Essais libres de 10 minutes, pneus, arrêts aux stands, pénalités par ralentissement, collisions et dégâts, aspiration, trajectoire idéale avec zones de freinage, niveaux de difficulté, son, météo, ralenti, contre-la-montre.
- Niveau visé : « ultra », sur mobile.

**Proposés par Claude, à valider**
- Mini-carte à gauche, au-dessus du frein ; bouton caméra sous le chrono.
- Accélération en bouton, avec option automatique dans le menu.
- Direction tactile en repli si le gyroscope est indisponible.
- Quatre circuits inventés : Valmora (rapide), Port-Azur (urbain), Forêt-Noire (vallonné), Al-Sahra (désert, de nuit). Premier circuit conseillé : Forêt-Noire, pour valider les pentes.

---

## 5. Répartition des rôles

| Qui | Rôle |
|---|---|
| Claude | Écrit le code, les tests et la documentation ; ouvre une demande de fusion par tâche |
| ChatGPT | Relit l'architecture et la physique ; commente les demandes de fusion |
| Josoa | Décide, teste sur téléphone, valide les fusions |
| GitHub | Source unique du code et des décisions |

Règles :
- Une tâche = une branche `claude/…` = une demande de fusion.
- Chaque demande de fusion contient une liste « Testé » et une liste « Non testé ».
- Une seule IA modifie le code à la fois.
- Aucun secret dans le dépôt : il est public.

---

## 6. Déploiement (option A)

- Chaque fusion dans `main` reconstruit le jeu et le publie sur GitHub Pages.
- Adresse HTTPS publique, ouvrable sur Android et iPhone.
- Le gyroscope demande une page HTTPS et, sur iPhone, une autorisation donnée par un appui de l'utilisateur. Un bouton « Activer l'inclinaison » est prévu.
