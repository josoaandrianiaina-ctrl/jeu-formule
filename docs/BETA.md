# Bêta du pilotage — ce qui existe

État au 12/11/2026. Branche `claude/beta-gameplay`.

## Ce qui marche, et qui a été testé

| Élément | Test |
|---|---|
| Générateur de circuits déterministe, boucle fermée, dénivelé | `tests/circuit.test.js` — continuité position, tangente, courbure, pente à la jonction ; rayon minimal ; pente maximale ; aucun croisement ; même graine, même circuit |
| Physique : suspensions, pneus, saturation combinée, moteur, boîte, freins, aéro, ABS, antipatinage | `tests/physique.test.js` — scénarios V1 à V11 de `PHYSIQUE.md`, chacun comparé à une référence calculée |
| Tour complet | Un pilote automatique boucle deux tours sur chaque circuit sans quitter la piste |
| Rendu, écran de course, commandes | Ouverts dans un navigateur sans écran : la partie démarre, la voiture roule, le chrono avance, les deux caméras et le rétroviseur s'affichent |

Chiffres mesurés sur sol plat, à partir des paramètres de `PHYSIQUE.md` :
0 à 100 km/h en 2,9 s · 311 km/h en pointe · 300 à 100 km/h en 97 m · 1,96 g en virage stabilisé à 128 km/h.

## Contenu

- Deux circuits générés : Forêt-Noire (3,6 km, vallonné) et Valmora (3,8 km, rapide).
- Une monoplace, quatre livrées.
- Essais libres de dix minutes, chrono au tour, trois secteurs, écart au meilleur tour, meilleur tour gardé sur l'appareil.
- Deux caméras, rétroviseur, mini-carte, écran du volant.
- DRS dans les zones marquées, au-dessus de 25 km/h.
- Direction au doigt ou par inclinaison du téléphone.
- Résolution adaptée à la fluidité mesurée.

## Ce qui n'existe pas encore

Adversaires et IA · qualifications et course · arrêts aux stands · usure et température des pneus
en jeu · météo · pénalités · dégâts visuels · son · championnat · garage · éditeur de circuits.

## Non vérifié

La fluidité sur un téléphone réel. Les essais automatiques tournent dans un navigateur
sans accélération matérielle : les images par seconde qu'ils affichent ne veulent rien dire.
Le compteur en haut de l'écran donne la mesure réelle sur l'appareil.

L'inclinaison n'a pas pu être essayée : elle demande un vrai téléphone, une page sécurisée,
et une autorisation. Elle ne fonctionne pas dans l'application Claude.
