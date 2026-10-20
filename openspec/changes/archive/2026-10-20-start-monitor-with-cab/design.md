# Conception

## Démarrage explicite

La commande /cab est un protocole versionné destiné à l'agent, pas un CLI
autonome. Je complète son mécanisme existant d'installation différée : après
résolution du workspace et prévol, la référence distribuée monitor-service.md
prépare le moniteur puis appelle systemctl --user daemon-reload et start.
Le moniteur est lancé avant le contrôleur pour que sa disponibilité ne dépende
pas de la réussite de ce dernier. Aucun service n'est activé au login.

Le paquet installé conserve scripts/ et web-monitor/ comme dossiers frères.
Il contient monitor, monitor-data, monitor-events, run-steps,
statistics-maintenance et observation-statistics, ainsi que index.html,
app.mjs, stats.mjs et style.css. Cette fermeture des imports est testée dans
une arborescence temporaire sans accès aux sources d'origine.

## Indépendance et réutilisation

L'unité garde sa configuration monitor.env distincte, Restart=on-failure,
UMask=0077 et NoNewPrivileges. Elle ne comporte aucune dépendance aux autres
unités CAB. /cab stop et la procédure de réinitialisation ne l'arrêtent pas,
ne ferment pas ses connexions et ne purgent ni sa configuration ni ses sources.
Son arrêt requiert une action explicite distincte sur son unité.

Une instance active conforme est réutilisée sans remplacement de fichiers,
modification de configuration ni redémarrage. La vérification porte sur
l'unité attendue, la version 1.6.1, l'URL loopback et le workspace canonique
exposé dans identity.workspace de GET /api/snapshot. Une identité divergente
ou un service actif d'une autre version est signalé ; aucune mise à jour
active ou réaffectation implicite n'est tentée.

La configuration explicite utilise les variables existantes du moniteur,
dont host/port 127.0.0.1:8790 par défaut. Une configuration existante est
préservée ; aucune lecture brute de fichier env ou de l'environnement complet
n'est autorisée. Sans paramètres non secrets suffisants pour vérifier une
instance existante, restituer la divergence plutôt que réécrire au hasard.
Les installations inactives appartenant au profil CAB sont actualisées depuis
le plugin résolu, avec écritures atomiques et droits privés.

## Diagnostic et repli

Le succès du moniteur exige service active et GET /api/snapshot ainsi que la
page locale accessibles, avec identité et version conformes. Ces réponses
ne prouvent pas la santé du broker ou des agents. Un échec de monitoring est
affiché séparément du statut CAB ; il ne ferme aucun RUN et ne redémarre aucun
autre composant. Le protocole CAB_ACTIF conserve ses préconditions existantes.
Un service joignable au mauvais workspace n'est jamais annoncé conforme.

En cas d'échec d'installation inactive, préserver ou restaurer seulement les
fichiers antérieurs concernés ; ne supprimer aucun profil étranger. Un port
occupé reste un diagnostic, sans tuer son propriétaire ni changer le port.
Le lancement manuel reste possible. Aucun mécanisme d'installation réelle
n'est exécuté pendant SCM ; seuls des profils et transports de test sont utilisés.

## Version et validations

Le jeu courant passe de la référence source 1.6.0 à 1.6.1, avec cachebuster
neuf. Les historiques et archives restent inchangés. Aucun schéma métier,
permission, gate ou format statistique n'est changé. Les tests couvrent
la commande, les unités, la fermeture des imports, le lancement du paquet
isolé sans composants amont, l'identité publique et les régressions. La revue
documentaire, UTF-8/LF et OpenSpec strict précède l'archivage individuel.
