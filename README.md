# jeu-formule

**Formula Racing Ultra 3D** — jeu de course de monoplaces en 3D pour mobile.

**[Jouer](https://josoaandrianiaina-ctrl.github.io/jeu-formule/)** — se joue dans le navigateur du téléphone, en paysage.

État : bêta du pilotage. Un circuit, une monoplace, essais libres chronométrés. Pas encore d'adversaires.

## Documents

- [Ce que contient la bêta](docs/BETA.md)
- [Architecture technique](docs/ARCHITECTURE.md)
- [Modèle physique](docs/PHYSIQUE.md)
- [Risques et dépendances](docs/RISQUES.md)
- [Feuille de route](docs/FEUILLE-DE-ROUTE.md)

## Construire

```
npm install
npm test     # 32 tests : physique, circuits, chronométrage
npm run dev
```

## Décisions en attente

1. Livrable : application sur le Play Store, ou jeu ouvert par une adresse web.
2. Appareils de référence et seuils de fluidité.
3. Moteur, après la mesure de fluidité sur téléphone : rester sur Three.js + Rapier, ou passer à Unreal Engine 5.

## Qui fait quoi

| Qui | Rôle |
|---|---|
| Claude | Code, tests, documentation |
| ChatGPT | Relecture de l'architecture et de la physique |
| Josoa | Décisions, essais sur téléphone, validation |

Voitures, écuries et circuits sont des créations originales.
