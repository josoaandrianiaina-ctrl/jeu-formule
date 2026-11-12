# Feuille de route

Statut : proposition de Claude, révisée après la revue de ChatGPT sur la PR n°1.
Règle : une étape ne commence qu'après validation de la précédente.
Aucune durée n'est promise ici.

Chaque étape se termine par une demande de fusion contenant : le code, ses
tests, sa documentation, une liste « Testé » et une liste « Non testé ».

Chaque étape a une **porte de validation sur téléphone** : Josoa ouvre la
version publiée sur l'appareil de référence et relève la fluidité affichée.

## Étape 0 — Décisions produit

À trancher par Josoa :
1. Livrable : application sur les stores, ou jeu ouvert par une adresse web.
2. Appareils de référence : modèle exact du ou des téléphones de test.
3. Seuils de fluidité. Proposition : 60 images par seconde visées, 50 en moyenne au minimum, 40 pour le 1 % le plus lent.

## Étape 1 — Faisabilité sur téléphone, puis choix du moteur

Contenu minimal commun aux deux essais : boucle de piste vallonnée, une voiture,
éclairage avec ombres, commandes, mesure de fluidité.

| Essai | Qui | Contenu |
|---|---|---|
| 1A — Web | Claude construit, Josoa mesure | Piste vallonnée générée, voiture simple, éclairage et ombres, commandes tactiles et gyroscope, compteur de fluidité à l'écran, publication sur GitHub Pages |
| 1B — Unreal | Josoa, sur son PC | Installer Unreal, empaqueter pour Android un projet d'exemple avec véhicule, mesurer la fluidité sur le même téléphone. Aucun code écrit par une IA n'est nécessaire |

L'essai 1B n'a de sens que si le livrable « stores » reste envisagé et si le PC
de Josoa fait tourner Unreal.

**Porte** : mesures relevées sur l'appareil de référence, comparées aux seuils.
**Décision** : moteur retenu, consigné dans `ARCHITECTURE.md`.

La suite décrit l'option A.

## Vers le premier prototype jouable

| Étape | Contenu | Validation automatique | Porte sur téléphone |
|---|---|---|---|
| 2. Générateur de circuit minimal | Générateur déterministe à graine, spline cubique périodique, profil vertical, dévers, maillage, collisions, vibreurs, barrières | Continuité de position, tangente, courbure et pente à la jonction ; pente maximale ; rayon minimal ; aucun croisement ; même graine, même circuit | Trois circuits générés s'affichent et se parcourent en caméra libre |
| 3. Voiture pilotable sur piste vallonnée | Modèle physique v0 : suspensions, pneus avec saturation combinée, roues, moteur, boîte, freins, appui et traînée | Scénarios V1, V2, V3, V5, V9, V10, V11 de `PHYSIQUE.md` | Un tour complet au pouce et au gyroscope |
| 4. Physique avancée | ABS, antipatinage, DRS, température et usure des pneus | Scénarios V4, V6, V7, V8 ; ABS sans blocage prolongé | Freinages appuyés et virages rapides sans comportement aberrant |
| 5. Pilotage et écran | Deux caméras, affichage tête haute, rétroviseur, mini-carte, chrono par secteur, trajectoire idéale et zones de freinage | Chrono et secteurs exacts sur un tour simulé | Lisibilité et fluidité avec l'écran complet |

**Livraison : prototype jouable n°1** — une voiture, un circuit généré, contre-la-montre.

## Vers la course

| Étape | Contenu | Validation |
|---|---|---|
| 6. Adversaires | IA sur trajectoire, freinage, dépassement, aspiration, collisions et dégâts, niveaux de difficulté | Une grille d'IA boucle plusieurs tours sans blocage ; fluidité tenue avec la grille complète |
| 7. Sessions | Essais libres de 10 minutes, qualifications, course, départ arrêté, classement, pénalités par ralentissement, arrêts aux stands, choix des pneus | Une course complète se termine avec un classement correct |
| 8. Ambiance | Son moteur et piste, pluie et adhérence, ralenti de fin de course, fantôme en contre-la-montre | Fluidité tenue sous la pluie |

**Livraison : prototype jouable n°2** — une course complète contre l'IA.

## Contenu

| Étape | Contenu |
|---|---|
| 9. Circuits | Générateur étendu (épingles, chicanes, styles), puis éditeur |
| 10. Carrière | Championnat, points, podium |
| 11. Garage | Livrées, réglages de la voiture |
| 12. Finition | Menus, profils graphiques, optimisation par appareil |

## Hors périmètre pour l'instant

- Multijoueur.
- Publication sur le Play Store et l'App Store, tant que le livrable n'est pas tranché.
- Voitures et décors de niveau « console ».
