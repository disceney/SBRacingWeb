# SB Racing Web

Remake HTML5 hommage à *SB Pro Racing* (1998) : courses de stock-cars sur ovale,
vue du dessus, peloton d'IA, carburant et arrêts aux stands. Code, graphismes
(procéduraux) et sons (synthèse Web Audio) entièrement originaux.

Le périmètre livré correspond au MVP du [cahier des charges](docs/cahier-des-charges.md) (§4.1).

## Jouer en ligne

Le jeu est jouable directement dans le navigateur, sans installation :
**[disceney.github.io/SBRacingWeb](https://disceney.github.io/SBRacingWeb/)**

## Prérequis

- Node.js ≥ 20

## Installation et lancement

```bash
npm install
npm run dev      # serveur de développement (http://localhost:5173)
npm run build    # vérification des types + bundle de production dans dist/
npm run preview  # sert le bundle de production
npm test         # tests unitaires Vitest
npm run lint     # ESLint
```

## Commandes en course

| Action                         | Touche                |
|--------------------------------|-----------------------|
| Tourner                        | Flèches gauche/droite |
| Accélérer                      | Flèche haut ou Maj    |
| Freiner / reculer              | Flèche bas ou Ctrl    |
| Pause (puis Q pour abandonner) | Échap                 |
| Remise en piste                | R                     |
| Couper / réactiver le son      | M                     |

## Structure

- `src/track/` — géométrie de l'ovale, surfaces, murs, trajectoires
- `src/vehicles/` — physique arcade, joueur, IA, collisions
- `src/race/` — tours, classement, chrono, carburant, stands, contrôleur de course
- `src/gfx/` — textures pixel-art générées au chargement
- `src/audio/` — sons synthétisés (Web Audio API)
- `src/scenes/` — Boot, Menu, Configuration, Course, Résultats, Options
- `src/data/` — circuit, voitures, pilotes, traductions
- `src/tests/` — tests unitaires

## Licence

MIT. Aucune ressource du jeu original n'est incluse (§27 du cahier des charges).
