# Validation SCM CAB3.1.0

Mandat explicite : intégration SGS, rapports locaux maîtres, projections PG,
cycles automatiques, retrait du prompt et CI/CD sur deux projets avec CABU.
RUN SCM-service-statistics-310 ; SID01a1c9e3-bed3-7a52-abca-0ea08eaa71d9.

## Résultats observés
-42tests ciblés PostgreSQL réussis : documents, garde PG, inconnus protégés,
 source locale manuelle, révisions, changement non commencé et régressions.
-Recette du vrai service en conteneur : catalogue/global sans appel LLM,
 édition locale125→275 reflétée par inotify, historique conservé, rapport actif
 généré, archivage amendé avec même source, marqueurs/SHA exacts, clôture sans
 fournir le rapport ou son SHA et reçu idempotent vérifiés.
-Migration0009 appliquée sur fixture ; Django makemigrations --check --dry-run
 sans changement. Canon existant CAB strict27/27, prompts strict7/7 ; deltas
 propres validés séparément. Les synchronisations ignorent les racines absentes.
-Référence Pixs en lecture seule :303changes,220rapports canoniques ; extraction
 sans erreur,20777lignes de tableaux et456entrées d’agents conservées. Aucun
 chiffre Pixs n’est copié comme mesure CAB et aucun fichier Pixs n’est modifié.
-Les colonnes/JSON gardent métriques, états, unités, preuves, agents/performance,
 coûts, ventilations, tableaux et texte brut ; toute divergence est explicite.
-Les publications ne créent pas de verrou fichier ; reprise contrôlée des jobs
 inconnus par PID/starttime et empreintes. L’ancien verrou libre est retiré en
 migration, sans créer de fichier ni ignorer un ancien writer encore actif.

## Transition et limites
Les nouveaux rapports sont générés par CAB. Pour l’amorçage de sa propre
livraison, la migration additive0009 testée a été appliquée après sauvegarde
privée et barrière d’admission temporaire. Le service3.0.7 est resté disponible.
Un worker ponctuel du code CAB candidat a produit le rapport et le global sous
réservation PG durable : job500db46960f6bea22715863f332bdaa8 COMPLETED,
265changes recensés et249rapports disponibles, couverture incomplète explicite.
Aucune statistique ou quantité n’a été rédigée par le LLM. La CI/CD/installation
reprend la migration déjà appliquée sans réinitialiser ses données.
Les fichiers STATISTICS.md dérivés ne font pas partie de l’empreinte du code ;
les preuves documentaires ont leurs propres empreintes de clôture.
Les phases transitoires/natives non couvertes restent N/A, jamais zéro.
Les changes ouverts sans session ne reçoivent pas de fichier individuel.
Les modifications manuelles de zone CAB sont préservées plutôt que remplacées.
Les rapports historiques sans marqueur restent vérifiables par SHA intégral.

## Publication et activation
CI/CD DIU prévue CAB3.1.0, puis prompts1.0.22 ; vérifications distinctes du DEB,
service, clients publics, profils et identités. Les journaux non versionnés sont
sous output/scm/cab-3.0.0/*310*. Les suppressions globales préexistantes sont
couvertes ; l’ancienne règle de non-recréation est remplacée par le nouveau
mandat explicite de génération automatique après inventaire.
AGENT_INTEGRATIONS.md reste absent ; aucune politique inventée. Règles du
socle et clients distribués sont adaptés au mandat explicite, sans propagation
manuelle d’AGENTS.md dans d’autres consommateurs.

Marqueurs change/projet et comparaison réelle fichier/PG testés : révision,
horodatage UTC, SHA du contenu hors marqueur et SHA intégral. Les fichiers
manuels restent vérifiables sans marqueur, aucun estampillage à la simple lecture.
Recette finale :42tests combinés réussis,12spécifiques au service/document et
30régressions de périodes/liaison ; prototype réel inotify+clôture+marqueurs validé.
