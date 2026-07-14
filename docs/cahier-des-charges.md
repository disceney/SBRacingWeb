# Cahier des charges — Remake HTML5 inspiré de *SB Pro Racing*

**Version :** 1.0
**Nom de travail :** SB Racing Web
**Type de projet :** jeu de course automobile 2D jouable dans un navigateur
**Plateformes cibles :** macOS, Windows, Linux, iOS et Android via navigateur moderne
**Technologies recommandées :** TypeScript, Phaser 3, Vite, WebGL/Canvas, Web Audio API

---

## 1. Références au jeu original

*SB Pro Racing* est un jeu de course pour Windows sorti en 1998. Il utilise une vue diagonale du dessus, un affichage fixe par zones, un circuit ovale inspiré des courses de stock-cars, plusieurs voitures contrôlées par l’ordinateur et une gestion du carburant.

Les informations documentées comprennent notamment :

- une sortie sur Windows en 1998 ;
- un modèle de distribution shareware ;
- un circuit ovale de type NASCAR ;
- une vue diagonale du dessus ;
- un affichage fixe avec changement d’écran ;
- une vitesse maximale indiquée de 180 mph ;
- les flèches pour diriger la voiture ;
- `Maj` pour accélérer ;
- `Ctrl` pour ralentir ;
- le choix du nombre de concurrents ;
- le choix de la couleur du véhicule ;
- le choix du nombre de tours ;
- une séance de qualification facultative ;
- une jauge de carburant ;
- une version shareware limitée à quatorze lancements.

### Liens de référence

- [Fiche de SB Pro Racing sur MobyGames](https://www.mobygames.com/game/178298/sb-pro-racing/)
- [Galerie de captures sur MobyGames](https://www.mobygames.com/game/178298/sb-pro-racing/screenshots/)
- [Capture MobyGames no 1081597](https://www.mobygames.com/game/178298/sb-pro-racing/screenshots/windows/1081597/)
- [Capture MobyGames no 1081586](https://www.mobygames.com/game/178298/sb-pro-racing/screenshots/windows/1081586/)
- [Galerie de captures sur My Abandonware](https://www.myabandonware.com/game/sb-pro-racing-mhl#screenshots)
- [Page générale de SB Pro Racing sur My Abandonware](https://www.myabandonware.com/game/sb-pro-racing-mhl)

> Les captures doivent servir de références visuelles et fonctionnelles. Elles ne doivent pas être réutilisées comme ressources du remake sans autorisation du titulaire des droits.

---

## 2. Objet du projet

Créer une nouvelle implémentation HTML5 reprenant l’expérience essentielle de *SB Pro Racing* :

- course de stock-cars sur circuit ovale ;
- vue 2D du dessus en légère perspective ;
- peloton de voitures contrôlées par une intelligence artificielle ;
- conduite arcade ;
- qualification facultative ;
- gestion du carburant ;
- arrêts aux stands ;
- classement en temps réel ;
- courses configurables ;
- fonctionnement sans installation dans un navigateur moderne.

Le projet n’est pas une conversion automatique de l’exécutable Windows. Il doit utiliser un code source nouveau ainsi que des graphismes, sons, textes et noms originaux ou correctement licenciés.

---

## 3. Objectifs

### 3.1 Objectifs principaux

1. Reproduire la simplicité et la lisibilité du jeu original.
2. Permettre de lancer une course en quelques secondes.
3. Maintenir 60 images par seconde sur un ordinateur courant.
4. Fonctionner sur Chrome, Safari, Firefox et Edge.
5. Être jouable au clavier, à la manette et sur écran tactile.
6. Ne nécessiter aucun compte utilisateur.
7. Fonctionner hors ligne après le premier chargement.
8. Pouvoir être installé comme application web progressive.
9. Prévoir une architecture permettant d’ajouter des circuits, véhicules et modes de jeu.
10. Préserver une esthétique de jeu shareware de la fin des années 1990.

### 3.2 Principes de conception

Le jeu doit privilégier :

- une prise en main immédiate ;
- des courses courtes et rejouables ;
- une physique arcade cohérente ;
- une stratégie de carburant compréhensible ;
- un peloton dense ;
- une interface sobre ;
- un faible temps de chargement ;
- une bonne lisibilité sur les écrans modernes.

Le réalisme automobile avancé n’est pas prioritaire.

---

## 4. Périmètre fonctionnel

### 4.1 MVP

Le produit minimum viable doit comprendre :

- un circuit ovale ;
- une voiture jouable ;
- neuf adversaires, soit dix voitures au total ;
- accélération, freinage et direction ;
- collisions entre véhicules ;
- collisions avec les murs et limites du circuit ;
- comptage des tours ;
- classement ;
- chronométrage ;
- consommation de carburant ;
- voie des stands ;
- ravitaillement ;
- écran de configuration ;
- compte à rebours de départ ;
- pause ;
- écran de résultats ;
- sons de moteur, dérapage et collision ;
- sauvegarde locale des réglages ;
- commandes clavier ;
- affichage adaptatif sur ordinateur et mobile.

### 4.2 Version 1.0

La version 1.0 ajoutera :

- qualification facultative ;
- trois niveaux de difficulté ;
- plusieurs longueurs de course ;
- choix de la couleur et du numéro de la voiture ;
- plusieurs livrées originales ;
- commandes reconfigurables ;
- compatibilité manette ;
- commandes tactiles ;
- tutoriel ;
- records locaux ;
- statistiques de course ;
- interface française et anglaise ;
- installation PWA ;
- mode plein écran ;
- options d’accessibilité ;
- assistance de pilotage facultative.

### 4.3 Évolutions possibles

Fonctionnalités hors périmètre initial :

- plusieurs circuits ;
- championnat ;
- usure des pneus ;
- dégâts mécaniques ;
- drapeaux jaunes ;
- météo ;
- replays ;
- fantôme du meilleur tour ;
- multijoueur local ;
- multijoueur en ligne ;
- éditeur de circuits ;
- classements en ligne ;
- sauvegarde dans le cloud.

---

## 5. Boucle de jeu

1. Le joueur ouvre le jeu.
2. Il sélectionne **Course rapide**.
3. Il configure la course.
4. Une qualification a lieu si l’option est activée.
5. La grille de départ est affichée.
6. La course commence après un compte à rebours.
7. Le joueur pilote, dépasse ses adversaires et surveille son carburant.
8. Il entre aux stands lorsque cela est nécessaire.
9. La course prend fin après le dernier tour.
10. Le classement et les statistiques sont affichés.
11. Le joueur peut recommencer ou modifier les paramètres.

---

## 6. Modes de jeu

### 6.1 Course rapide

Paramètres configurables :

- nombre total de voitures : 2 à 20 ;
- nombre de tours : 5, 10, 20, 30, 50 ou valeur personnalisée ;
- difficulté : facile, normale ou difficile ;
- qualification : activée ou désactivée ;
- consommation : désactivée, réduite, normale ou élevée ;
- collisions : activées ou désactivées ;
- position de départ aléatoire lorsque la qualification est désactivée ;
- couleur de la voiture ;
- numéro de course.

Configuration par défaut recommandée :

- dix voitures ;
- vingt tours ;
- difficulté normale ;
- qualification activée ;
- consommation normale ;
- collisions activées.

### 6.2 Qualification

La qualification comprend :

- un tour de lancement ;
- deux tours chronométrés ;
- un classement selon le meilleur tour ;
- une grille de départ fondée sur le résultat ;
- la possibilité de passer la séance ;
- la possibilité de recommencer avant validation.

### 6.3 Tutoriel

Le tutoriel explique :

1. l’accélération ;
2. la direction ;
3. le freinage ;
4. le classement ;
5. le comptage des tours ;
6. la jauge de carburant ;
7. l’entrée dans les stands ;
8. le ravitaillement ;
9. la sortie des stands.

---

## 7. Contrôles

### 7.1 Clavier

Configuration par défaut :

| Action                     | Touche             |
|----------------------------|--------------------|
| Tourner à gauche           | Flèche gauche      |
| Tourner à droite           | Flèche droite      |
| Accélérer                  | Flèche haut ou Maj |
| Freiner                    | Flèche bas ou Ctrl |
| Pause                      | Échap              |
| Remise en piste            | R                  |
| Couper ou réactiver le son | M                  |

Les commandes doivent être entièrement reconfigurables.

### 7.2 Manette

| Action          | Commande                             |
|-----------------|--------------------------------------|
| Direction       | Stick gauche ou croix directionnelle |
| Accélérateur    | Gâchette droite                      |
| Frein           | Gâchette gauche                      |
| Pause           | Bouton Menu                          |
| Remise en piste | Bouton configurable                  |

La détection doit utiliser la Gamepad API.

### 7.3 Écran tactile

L’interface tactile doit proposer :

- deux boutons de direction ou un volant virtuel ;
- un bouton d’accélération ;
- un bouton de freinage ;
- un bouton de pause ;
- une option d’accélération automatique ;
- une assistance de direction facultative.

---

## 8. Modèle de conduite

### 8.1 Type de physique

La physique doit être arcade, déterministe et calculée en deux dimensions.

Chaque véhicule possède au minimum :

- une position X et Y ;
- une orientation ;
- une vitesse longitudinale ;
- une vitesse latérale ;
- une accélération ;
- une puissance de freinage ;
- une vitesse de rotation ;
- une adhérence ;
- une masse ;
- une zone de collision ;
- un niveau de carburant ;
- un état de course.

### 8.2 Comportement attendu

La voiture doit :

- accélérer progressivement ;
- atteindre une vitesse maximale ;
- perdre de la vitesse dans les virages ;
- produire un léger dérapage à haute vitesse ;
- ralentir fortement sur l’herbe ;
- rebondir modérément contre un mur ;
- être perturbée lors d’un contact ;
- rester contrôlable après une collision légère ;
- pouvoir repartir après un tête-à-queue.

### 8.3 Valeurs initiales proposées

- vitesse maximale : 180 mph ;
- vitesse conseillée en virage : 135 à 155 mph ;
- vitesse maximale dans les stands : 55 mph ;
- accélération de 0 à 100 mph : environ 4 secondes ;
- freinage de 180 à 60 mph : environ 3 secondes.

Ces valeurs devront être équilibrées au cours des tests.

### 8.4 Surfaces

| Surface         | Adhérence | Résistance | Vitesse maximale |
|-----------------|----------:|-----------:|-----------------:|
| Asphalte        |     100 % |     Faible |            100 % |
| Voie des stands |     100 % |     Faible |          Limitée |
| Herbe           |      45 % |     Élevée |             40 % |
| Bordure         |      75 % |    Moyenne |             70 % |
| Mur             | Collision |          — |                — |

### 8.5 Collisions

Le système doit gérer :

- voiture contre voiture ;
- voiture contre mur ;
- voiture contre séparateur des stands ;
- contacts latéraux ;
- collisions arrière ;
- correction des chevauchements ;
- dégagement des véhicules bloqués.

Aucune collision ne doit immobiliser durablement le peloton.

---

## 9. Circuit

### 9.1 Composition

Le premier circuit doit comprendre :

- deux lignes droites ;
- deux grands virages ;
- plusieurs trajectoires exploitables ;
- une voie des stands parallèle à la ligne droite principale ;
- une entrée et une sortie des stands ;
- une ligne de départ et d’arrivée ;
- une grille à deux files ;
- une zone de ravitaillement ;
- des murs extérieurs ;
- une zone intérieure engazonnée ;
- des tribunes ;
- des véhicules de service ;
- des éléments de décor évoquant les captures originales.

Le circuit ne doit reprendre aucun nom, logo ou tracé NASCAR protégé.

### 9.2 Dimensions logiques recommandées

- monde : 2 400 × 1 400 unités ;
- largeur de piste : 220 unités ;
- largeur de voie des stands : 75 unités ;
- longueur d’un tour : environ 4 500 unités ;
- espacement longitudinal sur la grille : 65 unités ;
- espacement latéral : 55 unités.

### 9.3 Détection des tours

Le circuit doit utiliser :

- une ligne principale ;
- au moins deux points de contrôle intermédiaires ;
- un ordre obligatoire de passage ;
- une détection du sens ;
- une prévention des tours frauduleux ;
- une distinction entre la piste et les stands.

---

## 10. Caméra

### 10.1 Mode fidèle

Le mode principal doit rappeler l’original :

- vue fixe en plongée ;
- circuit divisé en plusieurs zones ;
- changement de cadrage lorsque le joueur passe d’une zone à l’autre ;
- interface fixe ;
- plusieurs voitures visibles simultanément.

### 10.2 Mode moderne facultatif

Une option pourra proposer :

- caméra centrée sur le joueur ;
- déplacement lissé ;
- légère anticipation vers l’avant ;
- zoom adaptatif.

### 10.3 Résolution interne

Résolution logique recommandée :

- 960 × 540 pixels ;
- format 16:9 ;
- mise à l’échelle entière lorsque possible ;
- mode pixels nets ;
- mode lissé facultatif.

---

## 11. Intelligence artificielle

### 11.1 Navigation

Chaque adversaire suit un ensemble de trajectoires composées de points ou de splines.

Trajectoires requises :

- ligne intérieure ;
- ligne centrale ;
- ligne extérieure ;
- ligne d’entrée aux stands ;
- ligne des stands ;
- ligne de sortie.

### 11.2 Comportements

L’IA doit gérer :

- maintien sur la trajectoire ;
- anticipation des virages ;
- accélération et freinage ;
- évitement d’une voiture lente ;
- dépassement intérieur ;
- dépassement extérieur ;
- retour progressif sur la trajectoire ;
- entrée aux stands ;
- sortie des stands ;
- récupération après collision ;
- réaction à un véhicule immobilisé.

### 11.3 Paramètres des pilotes

Chaque pilote possède :

- une vitesse cible ;
- une précision ;
- une agressivité ;
- une régularité ;
- une préférence de trajectoire ;
- une probabilité d’erreur ;
- une marge de carburant ;
- une tolérance au trafic.

### 11.4 Difficulté

#### Facile

- adversaires 8 à 15 % plus lents ;
- erreurs plus fréquentes ;
- consommation du joueur réduite ;
- assistance de direction disponible.

#### Normale

- performances équilibrées ;
- stratégie de stands standard ;
- contacts modérément pénalisants.

#### Difficile

- trajectoires proches de l’optimum ;
- dépassements plus efficaces ;
- erreurs rares ;
- consommation normale ;
- aucune assistance imposée.

Le rattrapage artificiel doit rester limité et discret.

---

## 12. Carburant et arrêts aux stands

### 12.1 Consommation

La consommation dépend :

- de la distance parcourue ;
- de la durée d’accélération ;
- de la vitesse ;
- du niveau de consommation sélectionné ;
- éventuellement du style de conduite.

La jauge doit :

- rester visible ;
- passer en avertissement sous 20 % ;
- clignoter sous 10 % ;
- produire une alerte sous 5 %.

Une panne sèche réduit progressivement la puissance avant d’immobiliser le véhicule.

### 12.2 Équilibrage

En consommation normale :

- cinq tours doivent pouvoir être terminés sans arrêt ;
- dix tours doivent laisser une faible marge ;
- vingt tours doivent imposer au moins un arrêt ;
- cinquante tours doivent autoriser plusieurs stratégies.

### 12.3 Entrée aux stands

Le joueur doit :

1. rejoindre l’entrée ;
2. ralentir ;
3. suivre la voie dédiée ;
4. s’arrêter dans son emplacement.

Une assistance facultative peut prendre le contrôle après le franchissement de la ligne d’entrée.

### 12.4 Ravitaillement

Pour le MVP :

- ravitaillement automatique lorsque la voiture est arrêtée ;
- jauge remplie progressivement ;
- arrêt de trois à cinq secondes pour un plein complet ;
- possibilité de repartir avant le plein ;
- reprise du contrôle à la sortie.

### 12.5 Stratégie des adversaires

Chaque IA évalue :

- le carburant restant ;
- le nombre de tours restants ;
- le temps perdu dans les stands ;
- le trafic ;
- une marge de sécurité.

Les adversaires ne doivent pas tous s’arrêter au même tour.

---

## 13. Déroulement d’une course

### 13.1 Départ

Le départ comprend :

- présentation de la grille ;
- compte à rebours ;
- commandes verrouillées avant le signal ;
- départ simultané.

### 13.2 Chronométrage

Le jeu mesure :

- le temps total ;
- le tour courant ;
- le dernier tour ;
- le meilleur tour personnel ;
- le meilleur tour de la course ;
- le temps passé aux stands ;
- les écarts.

### 13.3 Classement

Le classement repose sur :

1. le nombre de tours terminés ;
2. la progression sur le tour courant ;
3. l’ordre des points de contrôle ;
4. le temps total après l’arrivée.

### 13.4 Fin de course

Après le passage du vainqueur :

- les concurrents terminent leur tour ;
- les résultats sont calculés ;
- le meilleur tour est mis en évidence ;
- les records locaux sont enregistrés.

---

## 14. Interface en course

L’interface doit afficher :

- position actuelle ;
- nombre total de voitures ;
- vitesse ;
- carburant ;
- tour actuel ;
- nombre total de tours ;
- retard éventuel en tours ;
- temps du tour courant ;
- dernier tour ;
- meilleur tour ;
- principaux concurrents ;
- état des stands ;
- avertissements.

L’organisation visuelle peut reprendre le principe de la barre inférieure visible dans les captures, sans recopier les éléments graphiques originaux.

---

## 15. Écrans

Le jeu comporte :

1. écran de chargement ;
2. menu principal ;
3. configuration ;
4. choix du véhicule ;
5. qualification ;
6. grille de départ ;
7. course ;
8. pause ;
9. résultats ;
10. records ;
11. tutoriel ;
12. options ;
13. crédits ;
14. mentions légales.

### Menu principal

- Course rapide
- Tutoriel
- Records
- Options
- Crédits

### Résultats

Informations affichées :

- position ;
- pilote ;
- numéro ;
- tours terminés ;
- temps total ;
- écart ;
- meilleur tour ;
- nombre d’arrêts ;
- temps passé aux stands ;
- statut final.

---

## 16. Direction artistique

### 16.1 Style

Le style doit rappeler un jeu shareware Windows de la fin des années 1990 :

- sprites 2D ;
- pixels nets ;
- palette vive ;
- ombres simples ;
- décors lisibles ;
- animations limitées ;
- interface inspirée de Windows 95/98 sans imitation exacte.

### 16.2 Véhicules

Chaque voiture doit disposer de :

- 16 ou 32 orientations ;
- une couleur principale ;
- un numéro lisible ;
- une ombre ;
- une variante de livrée ;
- une taille d’environ 36 à 48 pixels de long.

### 16.3 Décors

Éléments requis :

- asphalte ;
- herbe ;
- lignes de piste ;
- murs ;
- tribunes ;
- public ;
- camions ;
- camping-cars ;
- véhicules de service ;
- stands ;
- ligne d’arrivée ;
- panneaux.

### 16.4 Animations

- rotation des voitures ;
- fumée lors des dérapages ;
- poussière sur l’herbe ;
- étincelles facultatives ;
- ravitaillement ;
- drapeau à damier ;
- avertissements clignotants.

---

## 17. Audio

### 17.1 Effets

- moteur au ralenti ;
- montée en régime ;
- freinage ;
- dérapage ;
- collision légère ;
- collision forte ;
- passage sur l’herbe ;
- entrée aux stands ;
- ravitaillement ;
- compte à rebours ;
- dernier tour ;
- arrivée ;
- navigation des menus.

### 17.2 Technique

Utiliser la Web Audio API avec :

- boucles sans coupure ;
- variation de hauteur du moteur ;
- préchargement ;
- limitation des sons simultanés ;
- reprise correcte après changement d’onglet.

---

## 18. Architecture technique

### 18.1 Pile recommandée

- **Langage :** TypeScript
- **Moteur :** Phaser 3
- **Compilation :** Vite
- **Rendu :** WebGL avec repli Canvas
- **Audio :** Web Audio API
- **Tests unitaires :** Vitest
- **Tests fonctionnels :** Playwright
- **Qualité :** ESLint et Prettier
- **Versionnement :** Git
- **Déploiement :** GitHub Pages, Cloudflare Pages, Netlify ou équivalent
- **Installation :** PWA

### 18.2 Boucle de simulation

- fréquence de simulation : 60 Hz ;
- pas fixe : 1/60 seconde ;
- rendu indépendant ;
- maximum de cinq étapes de rattrapage ;
- temps de trame plafonné après une pause.

```text
accumulateur += tempsEcouleLimite

tant que accumulateur >= pasFixe :
    lireEntrees()
    mettreAJourIA()
    mettreAJourPhysique()
    resoudreCollisions()
    mettreAJourCourse()
    accumulateur -= pasFixe

dessiner(interpolation)
```

### 18.3 Organisation du projet

```text
src/
  app/
  scenes/
    BootScene
    MenuScene
    SetupScene
    QualifyingScene
    RaceScene
    ResultsScene
  race/
    RaceController
    LapTracker
    RankingSystem
    TimingSystem
    FuelSystem
    PitSystem
  vehicles/
    Vehicle
    VehiclePhysics
    PlayerController
    AIController
    VehicleFactory
  track/
    Track
    TrackLoader
    Checkpoint
    RacingLine
    SurfaceMap
  ui/
    HUD
    Menus
    Dialogs
    TouchControls
  audio/
    AudioManager
    EngineSound
  data/
    tracks/
    cars/
    drivers/
    translations/
  persistence/
  tests/
```

---

## 19. Formats de données

### 19.1 Circuit

```json
{
  "id": "classic-oval",
  "name": "Classic Oval",
  "worldWidth": 2400,
  "worldHeight": 1400,
  "startLine": {
    "x1": 1180,
    "y1": 1080,
    "x2": 1180,
    "y2": 850
  },
  "checkpoints": [],
  "racingLines": {
    "inside": [],
    "middle": [],
    "outside": [],
    "pitEntry": [],
    "pitLane": [],
    "pitExit": []
  },
  "surfaces": [],
  "gridSlots": [],
  "pitBoxes": []
}
```

### 19.2 Véhicule

```json
{
  "id": "stock-standard",
  "maxSpeedMph": 180,
  "acceleration": 42,
  "braking": 65,
  "steeringRate": 2.4,
  "grip": 0.88,
  "mass": 1500,
  "fuelCapacity": 100,
  "fuelConsumption": 1
}
```

### 19.3 Pilote IA

```json
{
  "id": "driver-07",
  "displayName": "R. Turner",
  "skill": 0.72,
  "aggression": 0.58,
  "consistency": 0.8,
  "pitRisk": 0.35,
  "preferredLine": "middle"
}
```

---

## 20. Sauvegarde locale

Données conservées :

- langue ;
- volumes ;
- commandes ;
- options graphiques ;
- dernier réglage de course ;
- records ;
- meilleurs tours ;
- statistiques ;
- progression du tutoriel.

Le MVP ne doit collecter aucune donnée personnelle.

---

## 21. PWA et mode hors ligne

Le jeu doit proposer :

- un manifeste web ;
- des icônes adaptées ;
- un service worker ;
- la mise en cache des ressources ;
- un lancement hors ligne après la première visite ;
- une mise à jour contrôlée ;
- un écran de chargement ;
- une notification de nouvelle version.

---

## 22. Compatibilité

Navigateurs :

- deux dernières versions de Chrome ;
- deux dernières versions d’Edge ;
- deux dernières versions de Firefox ;
- deux dernières versions de Safari macOS ;
- deux dernières versions de Safari iOS ;
- deux dernières versions de Chrome Android.

Résolutions minimales :

- ordinateur : 1 024 × 576 ;
- mobile paysage : 667 × 375 ;
- tablette : 1 024 × 768.

---

## 23. Performances

Objectifs :

- 60 FPS sur ordinateur courant ;
- minimum de 30 FPS sur mobile compatible ;
- vingt véhicules sans ralentissement majeur ;
- chargement initial inférieur à 10 secondes ;
- bundle initial idéalement inférieur à 10 Mo ;
- mémoire inférieure à 250 Mo ;
- aucune allocation importante dans la boucle principale ;
- reprise correcte après changement d’onglet.

---

## 24. Accessibilité

- commandes reconfigurables ;
- mode daltonien ;
- contraste renforcé ;
- taille d’interface réglable ;
- informations non communiquées uniquement par la couleur ;
- alertes visuelles et sonores ;
- réduction des clignotements ;
- réduction des mouvements de caméra ;
- accélération automatique ;
- assistance de direction ;
- navigation clavier dans les menus.

---

## 25. Localisation

Langues initiales :

- français ;
- anglais.

Contraintes :

- textes externalisés ;
- aucune phrase intégrée directement dans les images ;
- mph par défaut ;
- option km/h ;
- formatage localisé des nombres et durées.

---

## 26. Sécurité et confidentialité

Le projet ne doit pas :

- exécuter de code distant non contrôlé ;
- demander de compte ;
- intégrer de publicité ;
- collecter de télémétrie sans consentement ;
- exposer de clé secrète ;
- dépendre d’un serveur pendant une course.

---

## 27. Contraintes juridiques

Le statut d’abandonware ne constitue pas une licence.

Avant publication :

1. rechercher le titulaire des droits ;
2. tenter de contacter le créateur ou ses ayants droit ;
3. ne pas extraire ni redistribuer les sprites et sons originaux sans autorisation ;
4. créer un nouveau logo ;
5. utiliser un titre distinct en l’absence d’autorisation ;
6. éviter les marques, équipes et circuits NASCAR réels ;
7. documenter la licence de chaque ressource ;
8. utiliser uniquement des sons, musiques et polices redistribuables.

Le remake doit reproduire les idées générales de gameplay, non les ressources protégées.

---

## 28. Tests

### 28.1 Tests unitaires

- conversion des vitesses ;
- consommation ;
- détection des tours ;
- ordre des points de contrôle ;
- classement ;
- meilleur tour ;
- entrée aux stands ;
- ravitaillement ;
- stratégie IA ;
- sauvegarde ;
- commandes.

### 28.2 Tests d’intégration

- course complète ;
- arrêt obligatoire ;
- panne sèche ;
- joueur avec un tour de retard ;
- arrivée serrée ;
- pause et reprise ;
- changement d’onglet ;
- reconnexion d’une manette ;
- passage clavier vers tactile ;
- installation PWA ;
- lancement hors ligne.

### 28.3 Tests de gameplay

- compréhension des commandes ;
- capacité à terminer une première course ;
- lisibilité du carburant ;
- facilité d’entrée aux stands ;
- qualité des dépassements ;
- fréquence des collisions ;
- distinction entre les difficultés ;
- intérêt stratégique des arrêts.

---

## 29. Critères d’acceptation du MVP

Le MVP est accepté lorsque :

- le jeu se lance sans erreur ;
- une course peut être terminée ;
- dix voitures peuvent courir simultanément ;
- la conduite fonctionne ;
- les collisions sont stables ;
- les tours sont comptés correctement ;
- le classement est fiable ;
- le carburant diminue ;
- une panne sèche est possible ;
- l’entrée aux stands fonctionne ;
- le ravitaillement fonctionne ;
- l’IA utilise les stands ;
- les résultats sont affichés ;
- les réglages sont sauvegardés ;
- le jeu reste fluide ;
- aucune ressource originale non autorisée n’est incluse.

---

## 30. Livrables

### Code

- dépôt Git ;
- code TypeScript ;
- scripts de compilation ;
- tests ;
- documentation ;
- licence.

### Ressources

- sprites sources ;
- atlas ;
- circuit ;
- sons ;
- icônes PWA ;
- polices ;
- inventaire des licences.

### Documentation

- cahier des charges ;
- guide d’installation ;
- architecture ;
- guide de contribution ;
- guide de création de circuits ;
- procédure de déploiement ;
- plan de test ;
- registre des licences.

---

## 31. Découpage du développement

### Phase 0 — Recherche

- analyser la version shareware ;
- enregistrer des séquences de référence ;
- documenter les écrans ;
- mesurer les vitesses ;
- vérifier les droits ;
- établir la direction artistique.

### Phase 1 — Prototype

- une voiture ;
- un ovale ;
- conduite ;
- murs ;
- caméra ;
- compteur de vitesse.

### Phase 2 — Course de base

- adversaires ;
- tours ;
- classement ;
- départ ;
- arrivée ;
- interface.

### Phase 3 — Carburant et stands

- consommation ;
- alertes ;
- panne sèche ;
- voie des stands ;
- ravitaillement ;
- stratégie IA.

### Phase 4 — Finition du MVP

- menus ;
- résultats ;
- audio ;
- sauvegarde ;
- responsive ;
- tests.

### Phase 5 — Version 1.0

- qualification ;
- manette ;
- tactile ;
- tutoriel ;
- accessibilité ;
- PWA ;
- localisation ;
- équilibrage.

---

## 32. Priorités MoSCoW

### Must have

- circuit ovale ;
- conduite ;
- adversaires ;
- classement ;
- tours ;
- carburant ;
- stands ;
- interface ;
- résultats ;
- clavier ;
- compatibilité ordinateur.

### Should have

- qualification ;
- manette ;
- tactile ;
- difficultés ;
- records ;
- audio complet ;
- PWA.

### Could have

- plusieurs circuits ;
- championnat ;
- pneus ;
- dégâts ;
- replays ;
- fantôme ;
- statistiques avancées.

### Won’t have dans la première version

- multijoueur en ligne ;
- licences NASCAR ;
- équipes réelles ;
- comptes ;
- boutique ;
- publicité ;
- serveur persistant.

---

## 33. Définition de terminé

Une fonctionnalité est terminée lorsqu’elle :

- correspond au cahier des charges ;
- dispose de tests ;
- fonctionne sur les navigateurs ciblés ;
- ne produit pas d’erreur majeure ;
- est utilisable au clavier ;
- est traduite ;
- est documentée ;
- n’utilise aucune ressource sans licence ;
- a été validée en situation de jeu.

---

## 34. Points à vérifier dans le jeu original

Une analyse plus poussée de la version shareware devra confirmer :

- la résolution native ;
- le nombre maximal de concurrents ;
- les choix exacts de tours ;
- le déroulement de la qualification ;
- les règles précises des stands ;
- la vitesse de ravitaillement ;
- la consommation par tour ;
- le comportement des collisions ;
- la présence éventuelle de dégâts ou d’usure ;
- le nombre de zones de caméra ;
- le comportement après une panne sèche ;
- le contenu de la version enregistrée ;
- les écrans et options non documentés.

Cette analyse doit rester documentaire. Aucun code ni actif extrait ne doit être intégré au remake sans autorisation.

---

## 35. Résultat attendu

Le produit final doit restituer les caractéristiques centrales de *SB Pro Racing* :

- une course de stock-cars immédiatement compréhensible ;
- une vue du dessus ;
- un circuit ovale ;
- un peloton dense ;
- une conduite arcade ;
- une gestion simple du carburant ;
- des arrêts aux stands ;
- une esthétique rappelant les sharewares Windows des années 1990.

Le remake doit toutefois être techniquement et artistiquement autonome : code moderne, ressources originales, fonctionnement dans un navigateur, compatibilité macOS, mode hors ligne et architecture extensible.
