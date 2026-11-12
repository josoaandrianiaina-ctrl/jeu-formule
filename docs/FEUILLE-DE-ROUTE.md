# Feuille de route

Statut : proposition de Claude pour l'option A (Three.js + Rapier).
Règle : une étape ne commence qu'après validation de la précédente.
Aucune durée n'est promise ici.

Chaque étape se termine par une demande de fusion contenant : le code, ses
tests, sa documentation, une liste « Testé » et une liste « Non testé ».

## Étape 0 — Décisions

À trancher par Josoa :
1. Moteur : option A ou option B (voir `ARCHITECTURE.md`, section 1).
2. Premier circuit.
3. Premier appareil de test : Android, iPhone ou les deux.

## Vers le premier prototype jouable

| Étape | Contenu | Validation |
|---|---|---|
| 1. Fondations | Projet, boucle à pas fixe, scène d'essai, publication automatique sur GitHub Pages | La page s'ouvre sur le téléphone de test |
| 2. Voiture pilotable | Châssis, quatre suspensions, moteur, boîte, freins, direction ; commandes tactiles et clavier ; sol plat | Tests automatiques : voiture immobile stable, accélération, distance de freinage, rayon de braquage. Essai sur téléphone |
| 3. Circuit fermé 3D | Spline 3D, maillage de piste, collisions, vibreurs, barrières, relief | Tests automatiques : la boucle est fermée ; en roue libre, la voiture accélère en descente et ralentit en montée |
| 4. Physique avancée | Appui et traînée, DRS, pneus (charge, glissement, température, usure), ABS, antipatinage | Tests automatiques : transfert de charge mesuré au freinage, vitesse en virage croissante avec l'appui |
| 5. Pilotage et écran | Deux caméras, affichage tête haute, rétroviseur, mini-carte, chrono par secteur, gyroscope, trajectoire idéale et zones de freinage | Essai sur téléphone par Josoa |

**Livraison : prototype jouable n°1** — une voiture, un circuit, contre-la-montre.

## Vers la course

| Étape | Contenu | Validation |
|---|---|---|
| 6. Adversaires | IA sur trajectoire, freinage, dépassement, aspiration, collisions et dégâts, niveaux de difficulté | Test automatique : une grille d'IA boucle plusieurs tours sans blocage. Essai sur téléphone |
| 7. Sessions | Essais libres de 10 minutes, qualifications, course, départ arrêté, classement, pénalités par ralentissement, arrêts aux stands, choix des pneus | Une course complète se termine avec un classement correct |
| 8. Ambiance | Son moteur et piste, pluie et adhérence, ralenti de fin de course, fantôme en contre-la-montre | Essai sur téléphone ; fluidité mesurée |

**Livraison : prototype jouable n°2** — une course complète contre l'IA.

## Contenu

| Étape | Contenu |
|---|---|
| 9. Circuits | Générateur paramétrable, autres circuits, puis éditeur |
| 10. Carrière | Championnat, points, podium |
| 11. Garage | Livrées, réglages de la voiture |
| 12. Finition | Menus, profils graphiques, optimisation par appareil |

## Hors périmètre pour l'instant

- Multijoueur.
- Publication sur le Play Store et l'App Store.
- Voitures et décors de niveau « console ».
