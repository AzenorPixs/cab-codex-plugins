## Context

SCM exécute directement cette évolution du protocole distribué, sans pilotage
OpenCode de production ni skill de statistiques SCMP. `/job/recover` conserve
ses gardes et son gel après échec. La nouvelle exception est une décision
opérationnelle de l'orchestrateur, pas un effet automatique de l'API.

## Goals / Non-Goals

Traiter uniquement une récupération échouée dont les preuves montrent à la
fois `true` au lieu de `/usr/bin/true` et un `change_id` différent du change
attendu. La récupération ordinaire, les changements de change et les simples
reconnexions restent sans purge. Aucun assouplissement de corrélation ni
redémarrage du processus OpenCode n'est permis.

## Decisions

1. Après le feu vert de la session, cette exception vaut autorisation durable
   de refaire une session CAB pour ce cas exact, sans nouvelle confirmation.
   Les demandes divergentes sont refusées ; tous les autres échecs conservent
   leurs règles et autorités habituelles.
2. Geler le travail, traiter les rapports, réconcilier les effets et rejeter
   explicitement les permissions/demandes restantes. Une écriture d'effet
   inconnu, une session occupée ou une propriété incertaine interdit la purge.
   Un job technique gelé avec gate OPEN peut être abandonné dans cette seule
   procédure après preuve d'inactivité. Ne pas appeler complete avec de
   fausses preuves, désarmer artificiellement ni déclarer TERMINÉ.
3. Conserver avant arrêt un checkpoint métier non secret hors runtime :
   objectif, change attendu, jalons, écritures validées et preuves natives,
   prochaine action, motif de l'échec et chemins résolus. Puis arrêter les
   ressources CAB du contexte et déconnecter nativement le broker sans fermer
   OpenCode. Le checkpoint métier n'est pas une copie de l'ancien runtime.
4. Les deux espaces sont `<home OpenCode>/.opencode/state/cgpt-approval-bridge`
   et `<racine projet>/.opencode/state/cgpt-approval-bridge`, résolus réellement
   avec leurs éventuels chemins personnalisés. L'outil existant les verrouille
   tous avant suppression ; ne pas lire, sauvegarder ou restaurer leurs
   approbations, journal, job, checkpoints techniques ou conflits Syncthing.
   Ne pas purger un espace partagé avec un autre travail. La suppression est
   irréversible ; si les preuves métier ne sont pas préservées, la refuser.
5. Créer une nouvelle session CAB et un nouveau job technique, avec nouveaux
   identifiants de session/job/mandat/approbation. Le change métier reste le
   change attendu du checkpoint, jamais celui de la demande erronée. Le test
   de ce redémarrage utilise exactement `/usr/bin/true`, sans suffixe, avec
   `change_id` correct, décision explicite et unique consommation native.
   Exiger readiness réelle READY et absence de permissions parasites.
6. Réconcilier les fichiers et les preuves conservées avant de reprendre au
   premier jalon non prouvé. Ne rejouer ni écriture validée ni autorisation
   consommée, ne réadopter ni ancien job ni ancienne décision. Une preuve
   manquante interdit de déduire un succès ou d'exécuter aveuglément un rejeu.

## Risks / Rollback

Le runtime est volontairement supprimé sans restauration ; le checkpoint et
les preuves métier externes sont donc des préconditions obligatoires. Les
modifications source sont locales et réversibles. Aucun changement de schéma
ou migration n'est nécessaire. Les tests utilisent des fichiers et services
loopback simulés ; ils ne prouvent pas une reprise de RUN réel.

## Validation

Valider le delta avant écriture du code/tests. Vérifier le refus du double
écart par HTTP, la purge bornée de deux espaces et la préservation du
checkpoint et de fichiers métier témoins. Contrôler la distribution des
gardes, les versions, la syntaxe, les suites CAB, JSON, UTF-8/LF et le
périmètre. Comparer les avertissements stricts historiques avant/après.
Après synchronisation et archivage autorisé, produire le rapport factuel
SCM à six sections sans invoquer le skill de statistiques.
