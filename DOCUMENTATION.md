<!-- arlette:documentation commit=b1fd4ca date=2026-07-15 engine=codex -->

# SB Racing Web

> Un jeu de course de stock-cars rétro sur navigateur, destiné aux amateurs de courses arcade et de sharewares des années 1990.

## Résumé

SB Racing Web transpose dans un navigateur l’expérience essentielle de *SB Pro Racing* : course sur ovale, vue du dessus, peloton contrôlé par IA et stratégie de stands. Le MVP actuel propose un circuit, un plateau fixe de vingt voitures, un tour de formation automatique, une physique arcade avec tête-à-queue, le carburant, les pneus, les dégâts, les collisions, un cycle jour-nuit et un classement chronométré. L’interface française fonctionne au clavier, à la manette ou au tactile, avec plein écran, sans backend, compte utilisateur ni ressource audiovisuelle externe. Le tutoriel, les records et la qualification ne sont pas livrés et aucune entrée de menu ne les expose.

## Identité

- **Problème** : Offrir une course de stock-cars rétro immédiatement jouable sans dépendre du logiciel Windows original de 1998.
- **Audience** : Joueurs sur navigateur disposant d’un clavier, d’une manette ou d’un écran tactile, amateurs de courses arcade courtes et d’esthétique shareware.
- **Proposition de valeur** : Combiner peloton IA, stratégie carburant-pneus-dégâts, cycle jour-nuit et production procédurale originale dans un bundle HTML5 autonome.

## Architecture

- **Stack** : TypeScript 6.0.3 strict ciblant ES2022, Phaser 3.90.0 avec WebGL/Canvas, HTML5, Web Audio API, Gamepad API, Fullscreen API et `localStorage` ; Vite 8.1.4, Vitest 4.1.10 sous Node, ESLint 10.7.0 avec `typescript-eslint` 8.63.0, Prettier 3.9.5 et Node.js ≥ 20 ; déploiement par GitHub Actions vers GitHub Pages, sans backend ni base de données.

### Répertoires

| Répertoire | Rôle |
|------------|------|
| `.claude/` | Déclare le lancement `vite-dev` par `npm run dev` sur le port `5173`. |
| `.git/` | Conserve l’historique et les métadonnées internes du dépôt Git. |
| `.github/` | Exécute sur `main` ou manuellement le lint, les douze suites, le build Node 20 puis le déploiement de `dist` sur GitHub Pages. |
| `.idea/` | Conserve les réglages locaux PhpStorm ignorés par Git et sans effet sur le build. |
| `dist/` | Reçoit le bundle Vite généré, composé d’un shell HTML et d’un asset JavaScript hashé. |
| `docs/` | Regroupe le cahier des charges et onze captures historiques servant de références fonctionnelles et visuelles. |
| `node_modules/` | Regroupe les dépendances npm installées localement et ignorées par Git. |
| `src/` | Répartit 55 fichiers TypeScript entre onze domaines de simulation, rendu, interface, données et tests. |
| `.gitattributes`, `.gitignore` | Normalisent les fichiers texte et excluent `.claude`, `.idea`, `node_modules` et `dist`. |
| `.prettierrc` | Configure les quotes simples, une largeur de 100 caractères et les virgules finales. |
| `DOCUMENTATION.md` | Centralise la source de vérité fonctionnelle, technique et visuelle destinée aux humains et aux LLMs. |
| `README.md` | Présente l’identité, le jeu en ligne, les commandes clavier, le périmètre MVP, l’installation et la licence MIT. |
| `eslint.config.js` | Applique les recommandations JavaScript et TypeScript aux sources, avec tolérance des arguments préfixés par `_`. |
| `index.html` | Monte le canvas dans `#game`, occupe tout le viewport et impose un rendu pixelisé sur fond noir. |
| `package.json`, `package-lock.json` | Verrouillent les dépendances et exposent les scripts `dev`, `build`, `preview`, `test`, `lint` et `format`. |
| `tsconfig.json` | Active le typage strict, les modules bundler et les contrôles d’éléments inutilisés ou non vérifiés. |
| `vite.config.ts` | Sert le développement sur `5173`, utilise la base relative `./` pour GitHub Pages et cible `es2022`. |
| `vitest.config.ts` | Exécute sous Node les douze suites correspondant au motif `src/tests/**/*.test.ts`. |

### Patterns

- Les sept `Phaser.Scene` forment le flux `boot` → `menu` → `setup` → `race` → `results`, avec `options` et `controls` accessibles depuis le menu.
- `RaceController` applique à `60 Hz` la chaîne IA, physique, collisions, tours, carburant, pneus, dégâts, stands et classement, après un tour de formation automatique.
- Les unions `RacePhase`, `RaceState` et `PitPhase` modélisent des machines à états explicites ; `RacePhase` suit `formation` → `racing` → `finished`, les stands cinq phases et `DayNightPhase` quatre phases.
- `RaceController.onEvent` découple les sept variantes effectivement émises de leur rendu dans `RaceScene` ; `RaceEvent` conserve aussi la variante `countdown`.
- `TrackData`, `CarSpec`, `DriverProfile` et `RaceSettings` séparent les données statiques des modèles d’exécution.
- `Track.optimalOffsetAt()` partage entre rendu et IA une trajectoire extérieure-corde-extérieure raccordée par `smoothstep`.
- Les textures du circuit, des voitures, des particules et des lumières sont générées dans des canvas puis mises en cache par clé Phaser.
- `PlayerController` verrouille les entrées manuelles pendant la formation, puis fusionne clavier, première manette et tactile par maximum ou somme bornée.
- `MenuList` centralise la navigation au clavier, le sondage de la manette et les interactions par pointeur.
- `loadSettings()` clone et assainit systématiquement les données persistées, en ramenant toujours `carCount` à vingt.
- Le dictionnaire `fr` centralise 127 libellés et `t()` réalise l’interpolation par placeholders `{nom}`.

### Intégrations

- Phaser 3.90.0 sélectionne automatiquement WebGL ou Canvas, adapte la résolution logique `960 × 540` et gère scènes, caméra, clavier, manette, pointeurs, particules, tweens et plein écran.
- Web Audio API synthétise moteur, dérapage, herbe, ravitaillement, collisions et alertes sans charger de fichier audio.
- Web Storage persiste sous `sb-racing-web:settings` le volume, la coupure sonore et la dernière configuration de course, avec un plateau restauré à vingt voitures.
- Les événements DOM `visibilitychange`, `keydown` et `pointerdown` suspendent l’audio, pilotent l’interface, déverrouillent `AudioContext` et basculent le plein écran avec `F`.
- Gamepad API lit stick, croix, gâchettes et boutons de la première manette ; `Start/Options` suspend la course, `A/Croix` confirme le stand et `navigator.getGamepads()` déclenche facultativement une vibration `dual-rumble`.
- GitHub Actions lance `npm ci`, le lint, les tests et le build avant de publier `dist` sur GitHub Pages à chaque push sur `main`.
- Aucun appel réseau applicatif, système d’authentification ou asset du jeu original n’intervient pendant la course.

## Conventions

- **Style** : Indentez avec une tabulation, ouvrez les accolades sur la ligne de déclaration, terminez par `;`, compactez les objets courts comme `{x, y}` et conservez les virgules finales des blocs multilignes. Visez 100 caractères par ligne ; le code TypeScript existant emploie majoritairement les doubles quotes malgré `singleQuote: true`.
- **Nommage** : Nommez classes, interfaces, types et fichiers principaux en `PascalCase` (`RaceController`), fonctions et membres en `camelCase` (`estimateFuelPerLap`), constantes globales en `UPPER_SNAKE_CASE` (`FIXED_STEP`) et clés techniques en kebab-case (`classic-oval`, `car-shadow`). Utilisez des clés de traduction hiérarchiques comme `hud.warning.lowFuel`.
- **Langue** : Rédigez identifiants et types en anglais, commentaires, tests, documentation et textes utilisateur en français ; conservez en anglais les noms propres fictifs des pilotes et circuits.
- **Idiomes** : Activez le typage strict, employez `import type`, `readonly`, les unions littérales et `Record` pour les états bornés, puis utilisez `as const` pour les dictionnaires immuables. Préférez les retours anticipés, les copies `{...settings}`, les callbacks optionnels `onEvent?.(...)` et les assertions `!` uniquement après un index borné.
- **Organisation** : Placez les règles de course dans `Race`, la cinématique et les contrôleurs dans `Vehicles`, la géométrie dans `Track`, les données statiques dans `Data`, le rendu procédural dans `Gfx`, les scènes dans `Scenes` et les widgets partagés dans `UI`. Ajoutez chaque test unitaire dans `Tests` avec des blocs `describe` et `it` rédigés en français.

## Design

- **Système** : Construisez l’interface avec les objets Phaser `Text`, `Graphics`, `Image`, `Rectangle`, `Arc` et `Container`, sans framework CSS ni DOM interactif. Conservez le thème sombre unique, `pixelArt: true`, `roundPixels: true` et les règles `image-rendering: pixelated` puis `crisp-edges`. Réservez le lissage canvas aux dégradés doux de `light-glow`, `light-beam` et `light-brake`, rendus en mode additif.
- **Palette** : Employez `#000000` pour le fond global, `0x14161c` à `0.94` pour le HUD, `0x3a4150` pour son liseré, `#f0d048` pour titres, sélection et joueur, `#e8e8e8` pour le texte principal, `#b8bec8` pour le secondaire, `#6a707c` pour les aides et éléments désactivés, `#68c8f0` pour l’information, `#e8a838` pour la prudence, `#f05840` pour le danger, `0x38c848` pour une jauge saine et `#b06cf0` pour le meilleur tour. Faites varier le disque de phase horaire de `#f0d048` à `#68c8f0` selon l’obscurité. Dessinez les jauges avec `0x2a2e38`, `0x585f6e` et le repère `0x8890a0`. Dessinez `TouchControls` avec `0x2a2e38` à `0.35` au repos, `0x585f6e` au contour, `0xf0d048` à `0.75` sous pression et `#e8e8e8` pour les glyphes. Assombrissez la nuit avec `0x000000` jusqu’à `0.55` ; composez les projecteurs avec `rgba(255,244,214,0.95)` et `rgba(255,224,160,0.5)`, les phares avec `rgba(255,248,224,0.75)` et `rgba(255,240,190,0.32)`, puis les freins avec `rgba(255,60,40,0.95)` et `rgba(255,40,30,0.5)`, chaque dégradé finissant à alpha nul. Réutilisez les tokens `DECOR` : `grass #2F8F2F`, `grassDark #2A812A`, `asphalt #5A5A62`, `asphaltPit #50505A`, `kerbRed #D82800`, `kerbWhite #F0F0F0`, `wall #C8C8D0`, `wallShadow #8A8A94`, `lineWhite #E8E8E8`, `lineYellow #E8C800`, `standSteel #787888`, `standSeat #4A4A58`, `roof #B03028`, `rubber #202024`, `asphaltJoint #78787E`, `kerbShadow #585860` et `treeDark #164A16`. Dessinez les détails des voitures avec `#101014` pour les roues et contours, `#585860` pour les moyeux, `#1a2a44/#0e1626/#4a6088` pour l’habitacle, `#fff4c8` pour les phares, `#e02818` pour les feux arrière et `#6a6a72` pour l’échappement. Pour une livrée, choisissez un triplet `base/dark/light` parmi les vingt entrées `CAR_COLORS` : Rouge `#D82800/#901B00/#FF6A3C`, Bleu `#0048D8/#002F90/#4C8CFF`, Jaune `#F0C000/#A08000/#FFE860`, Vert `#00A020/#006414/#50E070`, Orange `#F07000/#A04A00/#FFB050`, Violet `#8020C0/#541480/#B868F0`, Cyan `#00A8B0/#006C72/#58E0E8`, Rose `#E858A0/#9C3A6A/#FF9CC8`, Blanc `#E8E8E8/#9A9A9A/#FFFFFF`, Noir `#303038/#181820/#585864`, Marron `#8A5024/#5A3416/#C08048`, Turquoise `#20C898/#148264/#68F0C4`, Bordeaux `#901838/#5C0F24/#C85070`, Marine `#203070/#141E48/#4858A0`, Olive `#788020/#4C5214/#A8B050`, Corail `#F85848/#A83A30/#FF9488`, Lavande `#9088E0/#5C5694/#C0BAFF`, Or `#C09828/#80661A/#E8C860`, Argent `#A8B0B8/#70767C/#D8DEE4` ou Lime `#88D800/#5A9000/#C0FF40`.
- **Typographie** : Utilisez exclusivement la famille générique `monospace`. Réservez `10px` aux libellés tactiles `FREIN`, `ACCÉL` et `STAND`, `11px` au HUD secondaire, `12px` aux aides et tableaux, `13–14px` aux informations, `18px` aux menus, `22–24px` aux glyphes tactiles, `26px` aux titres de section et à la vitesse, `40–44px` aux titres principaux et `56px` aux annonces centrales. Conservez les libellés majeurs en capitales ; limitez le gras aux textes dessinés dans les textures procédurales en `bold 9px`, `12px` ou `14px monospace`.
- **Espacements & grille** : Positionnez l’UI sur la grille logique fixe `960 × 540`, mise à l’échelle par `Phaser.Scale.FIT` et centrée par `CENTER_BOTH`, sans breakpoint. Réservez les 80 pixels inférieurs au HUD et alignez ses six colonnes sur `x = 10, 130, 250, 420, 620, 810`. Placez les commandes tactiles de conduite sur `y = 430` aux abscisses `60`, `150`, `800` et `890`, le bouton contextuel `STAND` en `x = 890, y = 350`, puis plein écran et pause sur `y = 30` aux abscisses `865` et `920`, avec un rayon de `26px`. Alignez l’écran des commandes sur trois colonnes `x = 80, 400, 690`, à partir de `y = 140` avec un interligne de `22px`. Espacez les lignes de `MenuList` de `30px`, ou `24px` dans les résultats, et centrez les titres avec `.setOrigin(0.5)`.
- **Composants** : Réutilisez `MenuList` pour toute liste navigable au clavier, à la manette ou au pointeur via `label`, `onActivate`, `onChange`, `disabled` et le callback `onBack`; appelez `refresh()` après une modification externe. Réutilisez `HUD` pour position, formation ou tours, vitesse, trois jauges, trois chronos, cinq concurrents, horloge fictive, phase lumineuse, états des stands et alertes. Instanciez `TouchControls` uniquement quand `isTouchDevice()` est vrai afin d’exposer sept boutons multi-touch : direction, accélérateur, frein, pause, plein écran et `STAND` contextuel. Composez les overlays ponctuels avec un `Container` Phaser fixé par `.setScrollFactor(0)` ; ne créez pas de boutons ou formulaires DOM parallèles.
- **Interactions** : Rendez la sélection par le chevron `▶` et `#f0d048`, l’état normal par `#e8e8e8` et l’état désactivé par `#6a707c`; aucun état visuel `hover` ou `focus` DOM n’existe, mais les entrées interactives utilisent le curseur main. Naviguez au clavier avec `↑/↓`, modifiez avec `←/→`, utilisez `Maj` pour le pas fin et validez avec `Entrée`, accompagné d’un blip sonore. Sur manette, utilisez croix ou stick avec une zone morte de `0.5`, une répétition après `350 ms` puis toutes les `160 ms`, `A/Croix` pour valider et `B/Rond` pour revenir. Au pointeur, activez une entrée par tap et modifiez une valeur selon la moitié gauche ou droite de sa zone de `520px`. En course, gérez `Échap`, `Q`, `R`, `M`, `A`, `E` et `F` pour pause, abandon, remise en piste, son, autopilote, accrochage au stand et plein écran ; verrouillez la conduite manuelle pendant le tour de formation. Fusionnez stick/croix et gâchettes de la première manette avec les commandes tactiles, utilisez `Start/Options` pour la pause et confirmez l’accrochage avec `A/Croix` ou le bouton tactile `STAND` lorsque l’invite apparaît. Faites passer les boutons tactiles de l’alpha `0.35` à `0.75` sous pression et vibrez la manette pendant `200 ms` après un choc si son actionneur le permet. Faites clignoter les jauges critiques toutes les `250 ms`, les alertes toutes les `300 ms`, pulsez la dalle joueur sur `550 ms` en `yoyo` et affichez la pause sur un voile noir d’opacité `0.55`.

## Domaines

### App

Le domaine App initialise Phaser et fixe les unités communes à toute la simulation.

- **Bootstrap** — `main.ts` enregistre sept scènes, active manette et pixel-art, adapte le canvas et bascule le plein écran avec `F`.
- **Constantes** — `constants.ts` fixe `960 × 540`, `60 Hz`, cinq rattrapages, `180 mph` et `55 mph`.

**Relations** : Scenes

### Audio

Le domaine Audio synthétise et mixe tous les retours sonores produits par le jeu.

- **Gestion** — `AudioManager` pilote volume, mute, trois nappes continues et six effets ponctuels simultanés.
- **Moteur** — `EngineSound` module deux oscillateurs, un filtre passe-bas et un gain selon régime et charge.

**Relations** : Scenes, UI

### Data

Le domaine Data fournit les configurations statiques consommées par le circuit, les véhicules et l’interface.

- **Véhicule** — `STOCK_CAR` fixe `maxSpeed` à `200 mph`, l’équilibre à environ `181 mph`, `acceleration` à `62`, `lateralGrip` à `135` et `coastDrag` à `6`.
- **Pilotes** — `DRIVERS` fournit les dix-neuf adversaires avec défense et régularité ; `AUTOPILOT_DRIVER` impose `consistency = 1`.
- **Circuit** — `CLASSIC_OVAL` construit un monde `2400 × 1400`, quatre checkpoints, vingt grilles, vingt stands et neuf projecteurs.
- **Traductions** — `fr` associe 127 clés aux libellés français ; `t()` interpole les paramètres avec `replaceAll`.

**Relations** : App, Gfx, Race, Track, Vehicles

### Gfx

Le domaine Gfx produit les textures pixel-art et centralise leurs couleurs réutilisables.

- **Palette** — `CAR_COLORS` propose vingt triplets de livrée ; `DECOR` fixe dix-sept couleurs de circuit.
- **Voitures** — `ensureCarTexture` génère trois variantes `44 × 24` selon `(colorIndex + raceNumber) % 3`, puis les met en cache.
- **Effets** — `ensureShadowTexture`, `ensurePitCrewTextures` et `ensureParticleTextures` créent ombre, équipiers et quatre particules.
- **Éclairage** — `ensureLightTextures` met en cache trois dégradés `96 × 96`, `120 × 60` et `24 × 24` pour projecteurs, phares et freins.
- **Circuit** — `ensureTrackTexture` dessine joints, gomme optimale, marquages usés, stands, public, panneaux, tentes, arbres et neuf pylônes.

**Relations** : Data, Scenes, Track

### Persistence

Le domaine Persistence conserve les préférences locales et protège l’application contre les données invalides.

- **Stockage** — `loadSettings` assainit volume et neuf réglages, force vingt voitures et borne les courses entre 20 et 200 tours ; `saveSettings` tolère les erreurs.

**Relations** : Race, Scenes

### Race

Le domaine Race applique les règles, ressources, états et résultats d’une course complète.

- **Configuration** — `RaceSettings` expose neuf paramètres, fixe vingt voitures et borne les courses entre 20 et 200 tours.
- **Orchestration** — `RaceController` simule formation puis course, émet sept des huit variantes de `RaceEvent` et accorde `75 s` aux attardés.
- **Sécurité** — Le chien de garde repositionne après `4,5 s` sur la ligne la plus libre et répare à `50 %`.
- **Cycle lumineux** — `DayNightSystem` dérive quatre phases aux seuils `0,2/0,4/0,75` et formate une horloge de `14:00` à `06:00`.
- **Carburant** — `FuelSystem` applique quatre multiplicateurs, calibre un plein normal sur 40–55 % de la course et fond la puissance sur quatre secondes.
- **Pneus** — `TireSystem` calibre un train normal sur 44–60 % de la course, use selon vitesse, glisse et surface, puis risque une crevaison sous `10 %`.
- **Dégâts** — `DamageSystem` ignore les impacts jusqu’à `15`, dégrade les performances, répare `12,5 %/s` et expose `repairTo()`.
- **Stands** — `PitSystem` enchaîne cinq phases, exige `E`/`A`/`STAND` au joueur manuel et parallélise les opérations.
- **Tours** — `LapTracker` valide quatre checkpoints ordonnés, rejette les raccourcis et régresse en marche arrière.
- **Classement** — `rankVehicles` trie les arrivés par tours puis temps, les autres par distance validée.
- **Chronométrage** — `TimingSystem` formate tours, temps totaux et écarts avec une précision à la milliseconde.

**Relations** : Data, Track, Vehicles

### Scenes

Le domaine Scenes pilote le parcours utilisateur, le rendu en course et les transitions Phaser.

- **Chargement** — `BootScene` génère circuit, ombre et quatre particules, restaure l’audio et ouvre le menu après `30 ms`.
- **Menu** — `MenuScene` propose quatre entrées actives : course rapide, options, commandes et crédits.
- **Commandes** — `ControlsScene` aligne dix actions clavier, sept manette et six tactiles, dont la confirmation du stand.
- **Configuration** — `SetupScene` modifie huit paramètres, quatre presets `20/30/50/100`, vingt couleurs et les bornes persistées.
- **Options** — `OptionsScene` règle le volume par pas de `10 %`, persiste immédiatement le son et accepte le retour manette.
- **Course** — `RaceScene` rend formation, horloge, cycle lumineux, véhicules, caméra, effets, stands, pause et simulation à pas fixe.
- **Résultats** — `ResultsScene` aligne dix colonnes, met en évidence le joueur et propose trois sorties navigables par `MenuList`.

**Relations** : App, Audio, Data, Gfx, Persistence, Race, Track, UI, Vehicles

### Tests

Le domaine Tests vérifie les règles déterministes et les cas limites sans lancer de navigateur.

- **Simulation** — `damage`, `fuel`, `tires`, `pit`, `strategy` et `spin` valident ressources, réparations, accrochage manuel, stratégie et toupies.
- **Course** — `lapTracker`, `ranking`, `dayNight` et `raceController` valident anti-triche, formation, chronométrage, horloge, arrivée et réapparition.
- **Infrastructure** — `storage` et `track` valident plateau forcé à vingt, assainissement, surfaces, murs, progression et conversions.
- **Couverture** — Les douze suites regroupent quatre-vingt-six cas exécutés par Vitest sous Node.

**Relations** : Data, Persistence, Race, Track, Vehicles

### Track

Le domaine Track transforme les données de circuit en géométrie analytique exploitable par la simulation.

- **Types** — `Surface` distingue asphalte, stands, bordure et herbe ; `TrackData` décrit aussi les positions des projecteurs.
- **Trajectoires** — `RacingLine` projette et échantillonne des polylignes ouvertes ou bouclées par distance cumulée.
- **Géométrie** — `Track` calcule progression, courbure, surfaces, murs et trois lignes décalées sur environ `4 488` unités.
- **Ligne optimale** — `optimalOffsetAt()` relie extérieur `+70`, corde `-70` et extérieur selon un profil `40/20/40`.
- **Stands** — `Track` construit trois polylignes dédiées à l’entrée, la circulation et la sortie élargie.

**Relations** : Data, Gfx, Race, Vehicles

### UI

Le domaine UI rend les widgets réutilisés par les scènes de menu et de course.

- **Menus** — `MenuList` navigue au clavier, à la manette ou au pointeur, ignore les entrées désactivées et détache ses listeners au shutdown.
- **HUD** — `HUD` actualise formation, tours, vitesse, jauges, chronos, cinq concurrents, horloge, phase lumineuse, stands et alertes.
- **Tactile** — `TouchControls` expose sept boutons circulaires multi-touch, dont `STAND` uniquement pendant l’invite d’accrochage.

**Relations** : App, Audio, Data, Race, Vehicles

### Vehicles

Le domaine Vehicles représente le plateau, lit les commandes et applique conduite, IA, physique et contacts.

- **État** — `Vehicle` centralise identité, cinématique, ressources, chronométrage, cinq états, cinq phases, `spinHeat` et `stuckTime`.
- **Fabrique** — `createRaceField` mélange dix-neuf IA, complète le joueur et attribue couleurs, numéros, grille et stands distincts.
- **Joueur** — `PlayerController` verrouille la formation puis fusionne clavier, première manette et source tactile en commandes normalisées.
- **IA** — `AIController` suit la ligne optimale, anticipe six distances, dépasse avec hystérésis, défend, simule les erreurs et planifie les arrêts.
- **Physique** — `stepVehiclePhysics` intègre accélération, freinage, glisse, tête-à-queue progressive, quatre surfaces, murs, marche arrière et limites mécaniques.
- **Collisions** — `resolveCarCollisions` sépare les cercles, échange leur impulsion et ignore les véhicules dans les stands.

**Relations** : App, Data, Gfx, Race, Track
