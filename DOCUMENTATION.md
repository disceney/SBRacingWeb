<!-- arlette:documentation commit=027c77d date=2026-07-14 engine=codex -->

# SB Racing Web

> Un jeu de course de stock-cars rétro sur navigateur, destiné aux amateurs de courses arcade et de sharewares des années 1990.

## Résumé

SB Racing Web transpose dans un navigateur l’expérience essentielle de *SB Pro Racing* : course sur ovale, vue du dessus, peloton contrôlé par IA et stratégie de stands. Le MVP actuel propose un circuit, jusqu’à quinze voitures, une physique arcade, le carburant, les pneus, les dégâts, les collisions et un classement chronométré. L’interface française fonctionne au clavier, sans backend, compte utilisateur ni ressource audiovisuelle externe. Le tutoriel, les records et la qualification ne sont pas livrés ; leurs entrées restent désactivées ou absentes.

## Identité

- **Problème** : Offrir une course de stock-cars rétro immédiatement jouable sans dépendre du logiciel Windows original de 1998.
- **Audience** : Joueurs sur navigateur disposant d’un clavier, amateurs de courses arcade courtes et d’esthétique shareware.
- **Proposition de valeur** : Combiner peloton IA, stratégie carburant-pneus-dégâts et production procédurale originale dans un bundle HTML5 autonome.

## Architecture

- **Stack** : TypeScript 6.0.3 strict ciblant ES2022, Phaser 3.90.0 avec WebGL/Canvas, HTML5, Web Audio API et `localStorage` ; Vite 8.1.4, Vitest 4.1.10 sous Node, ESLint 10.7.0 avec `typescript-eslint` 8.63.0, Prettier 3.9.5 et Node.js ≥ 20 ; aucun backend ni base de données.

### Répertoires

| Répertoire | Rôle |
|------------|------|
| `.claude/` | Déclare le lancement `vite-dev` par `npm run dev` sur le port `5173`. |
| `.git/` | Conserve l’historique et les métadonnées internes du dépôt Git. |
| `.idea/` | Conserve les réglages locaux PhpStorm ignorés par Git et sans effet sur le build. |
| `dist/` | Reçoit le bundle Vite généré, composé d’un shell HTML et d’un asset JavaScript hashé. |
| `docs/` | Regroupe le cahier des charges et onze captures historiques servant de références fonctionnelles et visuelles. |
| `node_modules/` | Regroupe les dépendances npm installées localement et ignorées par Git. |
| `src/` | Répartit les 58 fichiers applicatifs entre onze domaines de simulation, rendu, interface, données et tests. |
| `.gitattributes`, `.gitignore` | Normalisent les fichiers texte et excluent `.idea`, `node_modules` et `dist`. |
| `.prettierrc` | Configure les quotes simples, une largeur de 100 caractères et les virgules finales. |
| `README.md` | Présente l’identité, les commandes clavier, le périmètre MVP, l’installation et la licence MIT. |
| `eslint.config.js` | Applique les recommandations JavaScript et TypeScript aux sources, avec tolérance des arguments préfixés par `_`. |
| `index.html` | Monte le canvas dans `#game`, occupe tout le viewport et impose un rendu pixelisé sur fond noir. |
| `package.json`, `package-lock.json` | Verrouillent les dépendances et exposent les scripts `dev`, `build`, `preview`, `test`, `lint` et `format`. |
| `tsconfig.json` | Active le typage strict, les modules bundler et les contrôles d’éléments inutilisés ou non vérifiés. |
| `vite.config.ts` | Sert le développement sur `5173` et produit un bundle ciblant `es2022`. |
| `vitest.config.ts` | Exécute sous Node les neuf suites correspondant au motif `src/tests/**/*.test.ts`. |

### Patterns

- Les six `Phaser.Scene` forment le flux `boot` → `menu` → `setup` → `race` → `results`, avec `options` accessible séparément.
- `RaceController` applique à `60 Hz` la chaîne IA, physique, collisions, tours, carburant, pneus, dégâts, stands et classement.
- Les unions `RacePhase`, `RaceState` et `PitPhase` modélisent des machines à états explicites ; les stands suivent cinq phases.
- `RaceController.onEvent` découple les huit événements de simulation de leur rendu visuel et sonore dans `RaceScene`.
- `TrackData`, `CarSpec`, `DriverProfile` et `RaceSettings` séparent les données statiques des modèles d’exécution.
- Les textures du circuit, des voitures et des particules sont générées dans des canvas puis mises en cache par clé Phaser.
- `loadSettings()` clone et assainit systématiquement les données persistées avant leur utilisation.
- Le dictionnaire `fr` centralise 89 libellés et `t()` réalise l’interpolation par placeholders `{nom}`.

### Intégrations

- Phaser 3.90.0 sélectionne automatiquement WebGL ou Canvas, adapte la résolution logique `960 × 540` et gère scènes, caméra, clavier, particules et tweens.
- Web Audio API synthétise moteur, dérapage, herbe, ravitaillement, collisions et alertes sans charger de fichier audio.
- Web Storage persiste sous `sb-racing-web:settings` le volume, la coupure sonore et la dernière configuration de course.
- Les événements DOM `visibilitychange`, `keydown` et `pointerdown` suspendent l’audio, pilotent l’interface et déverrouillent `AudioContext`.
- Aucun appel réseau, service externe, système d’authentification ou asset du jeu original n’intervient à l’exécution.

## Conventions

- **Style** : Indentez avec une tabulation, ouvrez les accolades sur la ligne de déclaration, terminez par `;`, compactez les objets courts comme `{x, y}` et conservez les virgules finales des blocs multilignes. Visez 100 caractères par ligne ; le code TypeScript existant emploie majoritairement les doubles quotes malgré `singleQuote: true`.
- **Nommage** : Nommez classes, interfaces, types et fichiers principaux en `PascalCase` (`RaceController`), fonctions et membres en `camelCase` (`estimateFuelPerLap`), constantes globales en `UPPER_SNAKE_CASE` (`FIXED_STEP`) et clés techniques en kebab-case (`classic-oval`, `car-shadow`). Utilisez des clés de traduction hiérarchiques comme `hud.warning.lowFuel`.
- **Langue** : Rédigez identifiants et types en anglais, commentaires, tests, documentation et textes utilisateur en français ; conservez en anglais les noms propres fictifs des pilotes et circuits.
- **Idiomes** : Activez le typage strict, employez `import type`, `readonly`, les unions littérales et `Record` pour les états bornés, puis utilisez `as const` pour les dictionnaires immuables. Préférez les retours anticipés, les copies `{...settings}`, les callbacks optionnels `onEvent?.(...)` et les assertions `!` uniquement après un index borné.
- **Organisation** : Placez les règles de course dans `Race`, la cinématique et les contrôleurs dans `Vehicles`, la géométrie dans `Track`, les données statiques dans `Data`, le rendu procédural dans `Gfx`, les scènes dans `Scenes` et les widgets partagés dans `UI`. Ajoutez chaque test unitaire dans `Tests` avec des blocs `describe` et `it` rédigés en français.

## Design

- **Système** : Construisez l’interface avec les objets Phaser `Text`, `Graphics`, `Image`, `Rectangle` et `Container`, sans framework CSS ni DOM interactif. Conservez le thème sombre unique, `pixelArt: true`, `roundPixels: true` et les règles `image-rendering: pixelated` puis `crisp-edges`.
- **Palette** : Employez `#000000` pour le fond global, `0x14161c` à `0.94` pour le HUD, `0x3a4150` pour son liseré, `#f0d048` pour titres, sélection et joueur, `#e8e8e8` pour le texte principal, `#b8bec8` pour le secondaire, `#6a707c` pour les aides et éléments désactivés, `#68c8f0` pour l’information, `#e8a838` pour la prudence, `#f05840` pour le danger, `0x38c848` pour une jauge saine et `#b06cf0` pour le meilleur tour. Dessinez les jauges avec `0x2a2e38`, `0x585f6e` et le repère `0x8890a0`. Réutilisez les tokens `DECOR` : `grass #2F8F2F`, `grassDark #2A812A`, `asphalt #5A5A62`, `asphaltPit #50505A`, `kerbRed #D82800`, `kerbWhite #F0F0F0`, `wall #C8C8D0`, `wallShadow #8A8A94`, `lineWhite #E8E8E8`, `lineYellow #E8C800`, `standSteel #787888`, `standSeat #4A4A58`, `roof #B03028`. Pour une livrée, choisissez un triplet `base/dark/light` parmi les vingt entrées `CAR_COLORS` : Rouge `#D82800/#901B00/#FF6A3C`, Bleu `#0048D8/#002F90/#4C8CFF`, Jaune `#F0C000/#A08000/#FFE860`, Vert `#00A020/#006414/#50E070`, Orange `#F07000/#A04A00/#FFB050`, Violet `#8020C0/#541480/#B868F0`, Cyan `#00A8B0/#006C72/#58E0E8`, Rose `#E858A0/#9C3A6A/#FF9CC8`, Blanc `#E8E8E8/#9A9A9A/#FFFFFF`, Noir `#303038/#181820/#585864`, Marron `#8A5024/#5A3416/#C08048`, Turquoise `#20C898/#148264/#68F0C4`, Bordeaux `#901838/#5C0F24/#C85070`, Marine `#203070/#141E48/#4858A0`, Olive `#788020/#4C5214/#A8B050`, Corail `#F85848/#A83A30/#FF9488`, Lavande `#9088E0/#5C5694/#C0BAFF`, Or `#C09828/#80661A/#E8C860`, Argent `#A8B0B8/#70767C/#D8DEE4` ou Lime `#88D800/#5A9000/#C0FF40`.
- **Typographie** : Utilisez exclusivement la famille générique `monospace`. Réservez `11px` au HUD secondaire, `12px` aux aides et tableaux, `13–14px` aux informations, `18px` aux menus, `26px` aux titres de section et à la vitesse, `40–44px` aux titres principaux et `56px` aux annonces centrales. Conservez les libellés majeurs en capitales ; limitez le gras aux textes dessinés dans les textures procédurales en `bold 9px`, `12px` ou `14px monospace`.
- **Espacements & grille** : Positionnez l’UI sur la grille logique fixe `960 × 540`, mise à l’échelle par `Phaser.Scale.FIT` et centrée par `CENTER_BOTH`, sans breakpoint. Réservez les 80 pixels inférieurs au HUD et alignez ses six colonnes sur `x = 10, 130, 250, 420, 620, 810`. Espacez les lignes de `MenuList` de `30px`, ou `24px` dans les résultats, et centrez les titres avec `.setOrigin(0.5)`.
- **Composants** : Réutilisez `MenuList` pour toute liste clavier via `label`, `onActivate`, `onChange` et `disabled`; appelez `refresh()` après une modification externe. Réutilisez `HUD` pour position, tours, vitesse, trois jauges, trois chronos, cinq concurrents et alertes. Composez les overlays ponctuels avec un `Container` Phaser fixé par `.setScrollFactor(0)` ; ne créez pas de boutons ou formulaires DOM parallèles.
- **Interactions** : Rendez la sélection par le chevron `▶` et `#f0d048`, l’état normal par `#e8e8e8` et l’état désactivé par `#6a707c`; aucun état `hover` ou `focus` DOM n’existe. Naviguez avec `↑/↓`, modifiez avec `←/→`, utilisez `Maj` pour le pas fin et validez avec `Entrée`, accompagné d’un blip sonore. En course, gérez `Échap`, `Q`, `R`, `M` et `A` pour pause, abandon, remise en piste, son et autopilote. Faites clignoter les jauges critiques toutes les `250 ms`, les alertes toutes les `300 ms`, pulsez la dalle joueur sur `550 ms` en `yoyo` et affichez la pause sur un voile noir d’opacité `0.55`.

## Domaines

### App

Le domaine App initialise Phaser et fixe les unités communes à toute la simulation.

- **Bootstrap** — `main.ts` enregistre six scènes, active le pixel-art et adapte le canvas au viewport.
- **Constantes** — `constants.ts` fixe `960 × 540`, `60 Hz`, cinq rattrapages, `180 mph` et `55 mph`.

**Relations** : Scenes

### Audio

Le domaine Audio synthétise et mixe tous les retours sonores produits par le jeu.

- **Gestion** — `AudioManager` pilote volume, mute, trois nappes continues et six effets ponctuels simultanés.
- **Moteur** — `EngineSound` module deux oscillateurs, un filtre passe-bas et un gain selon régime et charge.

**Relations** : Scenes, UI

### Data

Le domaine Data fournit les configurations statiques consommées par le circuit, les véhicules et l’interface.

- **Véhicule** — `STOCK_CAR` calibre vitesse, accélération, freinage, direction, adhérence, traînée, réservoir et collision.
- **Pilotes** — `DRIVERS` fournit dix-neuf adversaires et `AUTOPILOT_DRIVER` un profil stable pour le joueur automatique.
- **Circuit** — `CLASSIC_OVAL` construit un monde `2400 × 1400`, quatre checkpoints, quinze grilles et quinze stands.
- **Traductions** — `fr` associe 89 clés aux libellés français ; `t()` interpole les paramètres avec `replaceAll`.

**Relations** : App, Gfx, Race, Track, Vehicles

### Gfx

Le domaine Gfx produit les textures pixel-art et centralise leurs couleurs réutilisables.

- **Palette** — `CAR_COLORS` propose vingt triplets de livrée ; `DECOR` fixe treize couleurs de circuit.
- **Voitures** — `ensureCarTexture` génère des sprites `44 × 24` numérotés et mis en cache par livrée.
- **Effets** — `ensureShadowTexture`, `ensurePitCrewTextures` et `ensureParticleTextures` créent ombre, équipiers et quatre particules.
- **Circuit** — `ensureTrackTexture` dessine un canvas déterministe unique avec piste, stands, tribunes, public et infield.

**Relations** : Data, Scenes, Track

### Persistence

Le domaine Persistence conserve les préférences locales et protège l’application contre les données invalides.

- **Stockage** — `loadSettings` assainit volume, booléens et neuf réglages ; `saveSettings` tolère les erreurs de `localStorage`.

**Relations** : Race, Scenes

### Race

Le domaine Race applique les règles, ressources, états et résultats d’une course complète.

- **Configuration** — `RaceSettings` expose neuf paramètres, initialisés à dix voitures, vingt tours et niveaux `normal`.
- **Orchestration** — `RaceController` séquence la simulation fixe, publie huit événements et clôt les attardés après `75 s`.
- **Carburant** — `FuelSystem` applique quatre multiplicateurs, estime huit unités par tour et fond la puissance sur quatre secondes.
- **Pneus** — `TireSystem` use selon vitesse, glisse et surface, risque une crevaison sous `10 %`.
- **Dégâts** — `DamageSystem` ignore les impacts sous `15`, dégrade les performances et répare `12,5 %/s`.
- **Stands** — `PitSystem` enchaîne `none`, `entering`, `toBox`, `stopped`, `exiting` et parallélise les opérations.
- **Tours** — `LapTracker` valide quatre checkpoints ordonnés, rejette les raccourcis et régresse en marche arrière.
- **Classement** — `rankVehicles` trie les arrivés par tours puis temps, les autres par distance validée.
- **Chronométrage** — `TimingSystem` formate tours, temps totaux et écarts avec une précision à la milliseconde.

**Relations** : Data, Track, Vehicles

### Scenes

Le domaine Scenes pilote le parcours utilisateur, le rendu en course et les transitions Phaser.

- **Chargement** — `BootScene` génère les ressources, restaure l’audio et ouvre le menu après `30 ms`.
- **Menu** — `MenuScene` propose cinq entrées, dont tutoriel et records désactivés avec la mention « À venir ».
- **Configuration** — `SetupScene` modifie neuf paramètres, cinq presets de tours, vingt couleurs et les bornes persistées.
- **Options** — `OptionsScene` règle le volume par pas de `10 %` et persiste immédiatement la coupure sonore.
- **Course** — `RaceScene` rend véhicules, caméra, particules, stands, pause et simulation à pas fixe.
- **Résultats** — `ResultsScene` aligne dix colonnes, met en évidence le joueur et propose trois sorties.

**Relations** : App, Audio, Data, Gfx, Persistence, Race, Track, UI, Vehicles

### Tests

Le domaine Tests vérifie les règles déterministes et les cas limites sans lancer de navigateur.

- **Simulation** — `damage`, `fuel`, `tires`, `pit` et `strategy` valident usure, pannes, réparations et décisions IA.
- **Course** — `lapTracker` et `ranking` valident anti-triche, progression, arrivée, écarts et formatage temporel.
- **Infrastructure** — `storage` et `track` valident assainissement local, surfaces, murs, progression et conversions.
- **Couverture** — Les neuf suites regroupent cinquante et un cas exécutés par Vitest sous Node.

**Relations** : Data, Persistence, Race, Track, Vehicles

### Track

Le domaine Track transforme les données de circuit en géométrie analytique exploitable par la simulation.

- **Types** — `Surface` distingue asphalte, stands, bordure et herbe avec adhérence, traînée et vitesse propres.
- **Trajectoires** — `RacingLine` projette et échantillonne des polylignes ouvertes ou bouclées par distance cumulée.
- **Géométrie** — `Track` calcule progression, courbure, surfaces, murs et trois lignes décalées sur environ `4 488` unités.
- **Stands** — `Track` construit trois polylignes dédiées à l’entrée, la circulation et la sortie.

**Relations** : Data, Gfx, Race, Vehicles

### UI

Le domaine UI rend les widgets réutilisés par les scènes de menu et de course.

- **Menus** — `MenuList` navigue, ignore les entrées désactivées, modifie les valeurs et détache son listener au shutdown.
- **HUD** — `HUD` actualise position, tours, vitesse, trois jauges, chronos, cinq concurrents et alertes prioritaires.

**Relations** : App, Audio, Data, Race, Vehicles

### Vehicles

Le domaine Vehicles représente le plateau, lit les commandes et applique conduite, IA, physique et contacts.

- **État** — `Vehicle` centralise identité, cinématique, ressources, chronométrage et cinq états de course et de stands.
- **Fabrique** — `createRaceField` tire jusqu’à quatorze IA, attribue couleurs, numéros, grille et stands distincts.
- **Joueur** — `PlayerController` verrouille le départ puis traduit flèches, `Maj` et `Ctrl` en commandes normalisées.
- **IA** — `AIController` suit trois lignes, anticipe six distances, dépasse, récupère et planifie ses arrêts.
- **Physique** — `stepVehiclePhysics` intègre accélération, freinage, glisse, quatre surfaces, murs, marche arrière et limites mécaniques.
- **Collisions** — `resolveCarCollisions` sépare les cercles, échange leur impulsion et ignore les véhicules dans les stands.

**Relations** : App, Data, Gfx, Race, Track
