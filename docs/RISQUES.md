# Risques et dépendances

Statut : relevé par Claude le 12/11/2026, à vérifier par ChatGPT.

## Risques

| N° | Risque | Gravité | Réponse proposée |
|---|---|---|---|
| R1 | **Unreal Engine ne tourne pas dans l'environnement de Claude.** Claude peut écrire du C++ et des fichiers de projet, mais ne peut ni les compiler ni lancer le jeu. Tout code Unreal livré serait « non testé ». | Bloquant pour l'option B | Option A, ou accepter que Josoa compile et rapporte chaque erreur |
| R2 | **iPhone avec Unreal : un Mac est requis** pour produire une version signée d'un projet C++, avec Xcode et un compte développeur Apple. Source : [documentation Epic, iOS](https://dev.epicgames.com/documentation/unreal-engine/ios-ipados-and-tvos-in-unreal-engine?lang=en-US). | Bloquant pour iPhone en option B | Option A (navigateur), ou Android seul au départ |
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
- la présence, dans Rapier 0.21.0, d'un contrôleur de véhicule à suspensions par roue, chargé sous Node.

Non vérifié :
- tout comportement de jeu : aucun code de jeu n'existe encore ;
- la fluidité sur téléphone ;
- la capacité du PC de Josoa à faire tourner Unreal.
