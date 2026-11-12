# Risques et dépendances

Statut : relevé par Claude le 12/11/2026, révisé après la revue de ChatGPT sur la PR n°1.

## Risques

| N° | Risque | Gravité | Réponse proposée |
|---|---|---|---|
| R1 | **Unreal Engine ne tourne pas dans l'environnement de Claude.** Claude peut écrire du C++ et des fichiers de projet, mais ne peut ni les compiler ni lancer le jeu. Tout code Unreal livré serait « non testé ». | Élevée en option B | Décision produit après l'essai sur téléphone ; en option B, Josoa compile et rapporte chaque erreur |
| R2 | **iPhone avec Unreal : un Mac est requis** pour produire une version signée d'un projet C++, avec Xcode et un compte développeur Apple. Source : [documentation Epic, iOS](https://dev.epicgames.com/documentation/unreal-engine/ios-ipados-and-tvos-in-unreal-engine?lang=en-US). | Élevée pour l'iPhone en option B | Android seul au départ, ou option A |
| R3 | **Unreal demande un PC de développement puissant** et plusieurs installations lourdes (moteur, Visual Studio, Android Studio). La capacité du PC de Josoa n'a pas été vérifiée. | Élevée en option B | Vérifier le PC avant tout choix de l'option B |
| R4 | **« Ultra réaliste, style console » dépasse un prototype.** Ce niveau repose sur des modèles, textures et sons produits par des artistes. Claude génère des formes par code, d'un détail limité. | Élevée, quelle que soit l'option | Viser d'abord une physique juste et une image propre ; améliorer le visuel ensuite, avec des modèles Blender si quelqu'un les produit |
| R5 | **Performances WebGL sur mobile** : trop de triangles, d'ombres ou d'objets fait chuter la fluidité. | Moyenne | Budget par image, résolution dynamique, niveaux de détail ; mesures sur téléphone réel à chaque étape |
| R6 | **Gyroscope** : indisponible dans l'appli Claude ; exige HTTPS, et une autorisation par appui sur iPhone. | Moyenne | GitHub Pages ; bouton d'activation ; direction tactile en repli |
| R7 | **Stabilité de la physique à haute vitesse** : roues qui traversent le sol, rebonds, vibrations. | Moyenne | Pas fixe court, limites de force de suspension, tests automatiques à vitesse maximale |
| R8 | **Deux IA sur un même dépôt** : modifications contradictoires. | Moyenne | Branches et demandes de fusion ; une seule IA modifie le code à la fois |
| R9 | **Marques et licences** : le nom « F1 », les écuries, pilotes, sponsors et circuits réels sont protégés. | Élevée si ignoré | Tout est inventé : voitures, écuries, circuits, logos |
| R10 | **Dépôt public** : tout ce qui est poussé est visible par tous. | Faible | Aucun mot de passe, clé ou donnée personnelle dans le dépôt |
| R11 | **Multijoueur** : demande un serveur, des comptes et de la synchronisation. | Hors prototype | Reporté ; non planifié |
| R12 | **Sauvegarde locale** : records et réglages restent sur un seul téléphone, et peuvent être effacés avec les données du navigateur. | Faible | Annoncé au joueur ; synchronisation reportée |
| R13 | **Accès de ChatGPT au dépôt** : selon son offre, ChatGPT peut lire et commenter sans pouvoir pousser du code. | Faible | ChatGPT relit ; Claude applique les corrections retenues |
| R15 | **Publication sur les stores en option A** : l'encapsulation d'un jeu web en application est possible en principe, mais ses coûts et contraintes ne sont pas évalués. | Élevée si le livrable visé est une application | Trancher le livrable à l'étape 0 ; évaluer l'encapsulation avant de s'engager |
| R16 | **Deux modèles d'adhérence concurrents** si un modèle de pneu est ajouté par-dessus le contrôleur de véhicule de Rapier. | Élevée | Contrôleur intégré non utilisé ; un seul modèle commande les forces (`PHYSIQUE.md`, section 1) |
| R17 | **Réalisme physique non démontré** : une liste de systèmes ne prouve pas un comportement de monoplace. | Élevée | Scénarios chiffrés V1 à V11 ; « ultra réaliste » n'est pas affirmé sans données de comparaison |
| R18 | **Performances déduites d'un test sur PC** au lieu d'être mesurées sur téléphone. | Moyenne | Porte de validation sur l'appareil de référence à chaque étape |
| R14 | **Ampleur du cahier des charges** : physique complète, IA, météo, stands, championnat, garage, éditeur de circuits. | Élevée | Feuille de route par étapes ; rien n'est commencé avant validation de l'étape précédente |

## Dépendances

**Option A — Three.js + Rapier**
- Three.js 0.187.0 et `@dimforge/rapier3d-compat` 0.21.0 (versions publiées sur npm, vérifiées).
- Node.js et npm pour construire et tester.
- GitHub Pages et GitHub Actions pour publier.
- Un navigateur mobile récent avec WebGL 2 et WebAssembly.

**Option B — Unreal Engine 5**
- Unreal Engine 5 et Visual Studio sur le PC de Josoa.
- Android Studio et les outils Android pour compiler sur Android.
- Un Mac avec Xcode et un compte développeur Apple pour l'iPhone.
- Blender pour les modèles.

## Ce qui a été vérifié, et ce qui ne l'a pas été

Vérifié par exécution réelle :
- les versions npm citées ;
- le chargement de Rapier 0.21.0 sous Node ;
- la cohérence des paramètres de départ de `PHYSIQUE.md` (vitesse maximale, appui, débattement, fréquence de suspension), par calcul.

Non vérifié :
- tout comportement de jeu : aucun code de jeu n'existe encore ;
- la fluidité sur téléphone, en option A comme en option B ;
- les affirmations de la revue sur le rendu mobile d'Unreal ;
- le coût d'une encapsulation pour les stores ;
- la capacité du PC de Josoa à faire tourner Unreal.
