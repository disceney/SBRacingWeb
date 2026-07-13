/** Chaînes françaises. Toute l'interface passe par ce dictionnaire (§25). */
export const fr = {
  // — Générique.
  'app.title': 'SB RACING WEB',
  'app.subtitle': 'Courses de stock-cars — hommage aux sharewares de 1998',
  'common.back': 'Retour',
  'common.on': 'Activées',
  'common.off': 'Désactivées',
  'common.comingSoon': 'À venir',

  // — Menu principal (§15).
  'menu.quickRace': 'Course rapide',
  'menu.tutorial': 'Tutoriel',
  'menu.records': 'Records',
  'menu.options': 'Options',
  'menu.credits': 'Crédits',
  'menu.hint': '↑/↓ pour choisir, Entrée pour valider',

  // — Configuration de course (§6.1).
  'setup.title': 'CONFIGURATION DE COURSE',
  'setup.carCount': 'Voitures',
  'setup.laps': 'Tours',
  'setup.fuel': 'Consommation',
  'setup.fuel.off': 'Désactivée',
  'setup.fuel.reduced': 'Réduite',
  'setup.fuel.normal': 'Normale',
  'setup.fuel.high': 'Élevée',
  'setup.tires': 'Usure pneus',
  'setup.collisions': 'Collisions',
  'setup.color': 'Couleur',
  'setup.number': 'Numéro',
  'setup.start': 'Prendre le départ',
  'setup.hint': '↑/↓ choisir, ←/→ modifier, Entrée pour lancer',

  // — Course / HUD (§14).
  'hud.position': 'POS',
  'hud.lap': 'TOUR',
  'hud.lapsDown': '+{n} TOUR(S)',
  'hud.speedUnit': 'MPH',
  'hud.fuel': 'ESSENCE',
  'hud.tires': 'PNEUS',
  'hud.timeCurrent': 'EN COURS',
  'hud.timeLast': 'DERNIER',
  'hud.timeBest': 'MEILLEUR',
  'hud.pit.entering': 'STANDS : ENTRÉE',
  'hud.pit.toBox': 'STANDS : EMPLACEMENT {n}',
  'hud.pit.stopped': 'RAVITAILLEMENT…',
  'hud.pit.exiting': 'STANDS : SORTIE',
  'hud.warning.lowFuel': 'CARBURANT FAIBLE',
  'hud.warning.criticalFuel': 'CARBURANT CRITIQUE !',
  'hud.warning.fuelOut': 'PANNE SÈCHE',
  'hud.warning.lowTires': 'PNEUS USÉS',
  'hud.warning.criticalTires': 'PNEUS MORTS !',
  'hud.warning.flatTire': 'CREVAISON !',
  'hud.warning.lastLap': 'DERNIER TOUR !',
  'hud.finished': 'ARRIVÉE !',
  'race.go': 'GO !',
  'race.paused': 'PAUSE',
  'race.pauseHint': 'Échap pour reprendre, Q pour abandonner',
  'race.muted': 'SON COUPÉ',

  // — Résultats (§15).
  'results.title': 'RÉSULTATS',
  'results.position': 'POS',
  'results.driver': 'PILOTE',
  'results.number': 'N°',
  'results.laps': 'TOURS',
  'results.time': 'TEMPS',
  'results.gap': 'ÉCART',
  'results.bestLap': 'MEILLEUR',
  'results.stops': 'ARRÊTS',
  'results.pitTime': 'TPS STANDS',
  'results.status': 'STATUT',
  'results.status.finished': 'Terminé',
  'results.status.fuelOut': 'Panne sèche',
  'results.status.running': 'Non classé',
  'results.raceBest': 'Meilleur tour en course : {time} — {driver}',
  'results.restart': 'Recommencer',
  'results.changeSettings': 'Modifier les réglages',
  'results.menu': 'Menu principal',

  // — Options.
  'options.title': 'OPTIONS',
  'options.volume': 'Volume général',
  'options.mute': 'Son',
  'options.mute.on': 'Coupé',
  'options.mute.off': 'Actif',

  // — Crédits.
  'credits.body':
    'Remake hommage à SB Pro Racing (1998).\nCode, graphismes et sons originaux — aucun contenu extrait du jeu.',
} as const;

export type TranslationKey = keyof typeof fr;
