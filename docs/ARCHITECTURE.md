# Architecture technique

Projet : **Formula Racing Ultra 3D** — jeu de course de monoplaces en 3D pour mobile.

Statut : proposition de Claude, révisée après la revue de ChatGPT sur la PR n°1.
Rien n'est encore construit. Ce document ne décrit aucun code existant.

---

## 1. Décision ouverte n°1 : le moteur

C'est une décision produit. Elle revient à Josoa et se prend **après** un essai
sur téléphone (étape 1 de la feuille de route), pas avant.

### Question préalable : quel livrable ?

| Livrable | Conséquence |
|---|---|
| Une application distribuée sur le Play Store et l'App Store | Oriente vers l'option B |
| Un jeu ouvert par une adresse web, installable sur l'écran d'accueil | Oriente vers l'option A |

### Critères

| Critère | Option A — Three.js + Rapier (web) | Option B — Unreal Engine 5 |
|---|---|---|
| Livrable | Page web, installable sur l'écran d'accueil | Application Android et iOS |
| Publication sur les stores | Non. Encapsulation possible en principe ; coûts non évalués | Oui |
| Plafond graphique | Limité par WebGL 2 sur mobile | Plus élevé ; rendu mobile avec compromis selon l'appareil |
| Qui compile et teste | Claude, à chaque modification | Josoa, sur son PC, à chaque modification |
| Matériel côté Josoa | Un téléphone | PC puissant ; Mac avec Xcode pour l'iPhone |
| Comptes payants | Aucun | Compte développeur Apple pour l'iPhone |
| Premier essai sur téléphone | Dès l'étape 1 | Après installation d'Unreal et des outils Android |
| Modèles 3D | Générés par code, ou fichiers GLB | Fichiers d'artistes attendus pour le niveau visé |

Contrainte à connaître : Claude ne peut pas compiler Unreal, et ChatGPT n'a pas
indiqué pouvoir le faire. En option B, la règle du projet « ne jamais prétendre
avoir testé sans test réel » impose que chaque test passe par le PC de Josoa.

### Essai comparatif avant décision

Défini à l'étape 1 de `FEUILLE-DE-ROUTE.md` : même contenu minimal, même
téléphone, fluidité mesurée. La décision s'appuie sur ces mesures et sur le
livrable voulu.

Le reste de ce document décrit l'option A. Si l'option B est retenue, les
sections 3 et 4 restent valables ; les sections 2 et 6 sont à réécrire.

---

## 2. Pile technique (option A)

| Rôle | Outil | Version vérifiée le 12/11/2026 |
|---|---|---|
| Rendu 3D | Three.js (WebGL 2) | 0.187.0 |
| Physique | Rapier 3D, paquet `@dimforge/rapier3d-compat` (WebAssembly) | 0.21.0 |
| Langage | TypeScript | à fixer à l'étape 1 |
| Assemblage | Vite | à fixer à l'étape 1 |
| Tests | Vitest (physique sous Node), Chrome sans écran (rendu) | à fixer à l'étape 1 |
| Hébergement | GitHub Pages, déployé par GitHub Actions | — |
| Modèles 3D | Générés par code au départ ; fichiers GLB (Blender) possibles ensuite | — |

Vérifié réellement : les deux versions ci-dessus sont celles publiées sur npm, et
Rapier 0.21.0 se charge sous Node.

Les performances de rendu ne se déduisent pas d'un test sur PC : elles sont
mesurées sur les téléphones cibles.

---

## 3. Systèmes

Chaque système vit dans son dossier, a ses propres tests, et ne dépend que du
noyau. Aucun système n'est « simulé par une animation ».

```
src/
  noyau/        boucle à pas fixe, état global, événements
  physique/     véhicule : châssis, roues, pneus, aéro, moteur, freins
  circuit/      générateur, spline 3D, maillage, collisions, secteurs, stands
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
- Physique à pas fixe (1/120 s), rendu à la fréquence de l'écran, interpolation entre les deux.
- La physique ne dépend jamais du rendu : elle tourne aussi sous Node pour les tests.

### 3.2 Physique du véhicule
Spécification complète dans [`PHYSIQUE.md`](PHYSIQUE.md) : répartition des
rôles avec Rapier, paramètres, équations, scénarios de validation chiffrés.

Points clés :
- Rapier intègre le châssis et détecte les contacts. Les forces de suspension, de pneu, de moteur, de frein et d'aérodynamique viennent du code du projet.
- Le contrôleur de véhicule intégré à Rapier n'est pas utilisé, pour qu'un seul modèle d'adhérence commande les forces.
- Le transfert de charge apparaît dans les forces de suspension. Il n'est considéré comme validé qu'après comparaison à la valeur théorique (tests V5 et V6), et le comportement des pneus qu'après les tests V4, V7 et V8.
- L'ABS et l'antipatinage sont des régulateurs définis sur le glissement, avec seuils et fréquence (section 4.7 de `PHYSIQUE.md`).

### 3.3 Circuits
Un générateur minimal existe **dès le premier circuit**. Aucune piste n'est dessinée à la main.

- Entrées : graine aléatoire, longueur, nombre de virages, dénivelé maximal, largeur.
- Même graine, même circuit : le générateur est déterministe.
- Tracé en plan : points de contrôle répartis autour d'un centre, à distance variable, ce qui exclut les croisements.
- Profil vertical : somme de quelques ondulations périodiques, donc raccordé par construction.
- Dévers : fonction de la courbure.
- Courbe : spline cubique périodique.
- Contrôles automatiques à chaque génération :
  - continuité de la position, de la tangente et de la courbure à la jonction ;
  - continuité du profil vertical et de la pente à la jonction ;
  - pente maximale et rayon de courbure minimal respectés ;
  - aucun croisement de la piste ;
  - longueur dans la tolérance.
- Maillage de piste, vibreurs et zones de dégagement produits depuis la spline.
- Collision : maillage triangulé pour la piste, volumes simples pour barrières et murs.
- Données de course portées par la spline : ligne de départ, trois secteurs, zones DRS, voie des stands, trajectoire idéale, points de freinage.
- Plus tard : générateur étendu (épingles, chicanes, styles) puis éditeur.

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
- Un compteur de fluidité intégré enregistre la moyenne et le 1 % le plus lent.
- Chaque étape de la feuille de route a une porte de validation sur téléphone.

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
- Quatre styles de circuits, obtenus par réglage du générateur : rapide, urbain, vallonné, désert de nuit. Premier style conseillé : vallonné, pour valider les pentes.

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
- Adresse HTTPS publique, ouvrable sur Android et iPhone, installable sur l'écran d'accueil.
- Le gyroscope demande une page HTTPS et, sur iPhone, une autorisation donnée par un appui de l'utilisateur. Un bouton « Activer l'inclinaison » est prévu.
