# Nouvelle session CAB : purge obligatoire

Exécuter cette procédure avant chaque nouvelle session CAB, même si son ancien
état semble sain, vide ou indispensable à un ancien codage. L'invocation de
`/cab start` autorise cette purge technique sans nouvelle confirmation. Ne pas
la déclencher pour une reprise ordinaire du même RUN, un compactage, une
reconnexion, un nouveau mandat ou change, ni pour `run`, `test`, `update` ou
`stop`. La seule exception est la récupération échouée au prévol divergent
définie ci-dessous ; elle ne relâche aucune garde de chemin ou de verrou.

1. Résoudre la racine du projet et le contexte propriétaire du broker par les
   métadonnées OpenCode. Passer leur `directory` explicitement à toutes les
   requêtes de contexte. Vérifier l'absence de RUN actif, sauf son seul job
   technique gelé neutralisé selon l'exception ci-dessous, ainsi que l'absence
   de session occupée, d'opération en cours et de permission native non résolue.
   Une propriété ou
   inactivité inconnue impose `CAB_INACTIF`, sans purge. Ne pas interrompre un
   autre travail pour obtenir ces préconditions.
2. Arrêter les anciens heartbeats et clients SSE CAB, puis les services
   utilisateur du superviseur et du contrôleur de ce contexte. Vérifier leur
   arrêt effectif avant de supprimer leurs états. Une ancienne readiness
   malsaine ou un ancien job abandonné n'interdit pas la purge d'une nouvelle
   session dont l'inactivité et la propriété sont prouvées.
3. Déconnecter uniquement `cgpt-validation` par
   `POST /mcp/cgpt-validation/disconnect?directory=<contexte encodé>`.
   Vérifier la déconnexion et la libération du verrou du broker. Ne pas tuer
   ni lancer directement le broker ; ne pas fermer ou redémarrer OpenCode.
4. Résoudre les espaces d'état réellement utilisés. Le broker utilise par
   défaut `<home OpenCode>/.opencode/state/cgpt-approval-bridge/` ; contrôleur et
   superviseur utilisent `<racine projet>/.opencode/state/cgpt-approval-bridge/`.
   Tenir compte des chemins personnalisés déclarés sans lire de secret ni
   d'environnement complet. Ne pas déduire le home du broker du home Codex.
   Un chemin personnalisé hors des espaces couverts interdit d'annoncer une
   purge complète : signaler la cible non prise en charge avant suppression.
5. Résoudre `scripts/cgpt-approval-bridge-reset.py` depuis le plugin installé,
   et l'interpréteur absolu depuis `DEVOPS.md`. L'exécuter dans une seule
   commande, avec `--confirm-new-session` et un `--state-dir` absolu par espace
   CAB distinct. Utiliser l'identité autorisée ayant accès aux espaces, sans
   changer leurs permissions ou propriétaires. L'outil ne lit pas l'historique.

   Exemple, à adapter aux chemins réellement observés :

   ```text
   <python absolu> <plugin>/scripts/cgpt-approval-bridge-reset.py --confirm-new-session --state-dir <home OpenCode>/.opencode/state/cgpt-approval-bridge --state-dir <projet>/.opencode/state/cgpt-approval-bridge
   ```

6. Exiger `CAB_STATE_RESET`, un code zéro et l'absence d'ancien contenu dans
   tous les espaces. La purge efface approbations, journal, checkpoints,
   états de remédiation, jobs, rappels, traces et tous leurs conflits
   Syncthing, sans sauvegarde ni tentative de restauration. Le seul inode
   `broker.instance.lock` peut rester vide : il protège la purge contre un
   démarrage concurrent. Une cible invalide, un verrou occupé, une erreur ou
   un état recréé impose `CAB_INACTIF` ; ne pas poursuivre après une purge
   partielle. Les sources, secrets, configurations, rapports et historiques
   natifs OpenCode/Codex restent hors des espaces purgés.
7. Reconnecter le broker par
   `POST /mcp/cgpt-validation/connect?directory=<racine encodée>`, puis vérifier
   `/global/health`, `/path` et `/mcp` dans ce contexte. Installer et démarrer
   ensuite les ressources CAB conformément au skill, puis créer une nouvelle
   session maîtresse. Ne pas réadopter l'ancien job ou sa session.
8. Appeler réellement `broker_readiness` dans cette session et exiger `READY`,
   zéro demande en attente et aucune permission parasite. Refaire `/cab test`
   avec un `requestId` inédit, une décision explicite, une réponse MCP corrélée
   et l'exécution unique de `true` avant tout mandat de travail. Dans
   l'exception ci-dessous, exiger exactement `/usr/bin/true`, sans suffixe,
   avec le `change_id` attendu du checkpoint ; `true` n'est pas équivalent.

## Exception : récupération échouée au prévol divergent

Après le feu vert, l'orchestrateur déclenche sans nouvelle confirmation une
nouvelle session CAB pour un prévol de récupération divergent ou incomplet,
prouvé par les appels natifs et refusé avant exécution sans effet observé ou
inconnu. Cela inclut un champ prescrit absent ou altéré (dont `approval_id`,
`files` et `timeout_seconds`), une commande ou un `change_id` divergent,
ainsi qu'une demande malformée rejetée avant enregistrement. Il n'est pas
nécessaire de cumuler deux écarts. Refuser le mandat erroné sans normalisation.
L'automatisation appartient à l'orchestrateur ; `/job/recover` conserve son
refus et son gel et ne l'exécute jamais automatiquement.

Un HTTP 409 seul, un texte de l'agent ou un délai MCP seul ne suffit pas :
vérifier les arguments réellement prescrits et leurs preuves natives.
Après un délai MCP ordinaire, interroger uniquement le même `approval_id`
sans créer de demande ni purger le runtime.

Avant l'étape 1, geler le travail, traiter les rapports, réconcilier les effets,
refuser les permissions divergentes et clôturer les demandes restantes sans
les approuver. Prouver les sessions inactives, l'absence de mandat actif ou en
attente et de permission non résolue. Effet inconnu, propriété incertaine ou
espace partagé avec un autre travail : refuser la purge.

Préserver hors des deux cibles un checkpoint métier non secret avec objectif,
change attendu, jalons, écritures validées, références des preuves natives,
prochaine action, motif de l'échec et chemins résolus. Vérifier que ces preuves
restent disponibles avant la suppression irréversible ; ne pas copier ni
restaurer l'ancien runtime pour les reconstituer. Checkpoints techniques dans
le runtime et checkpoint métier externe sont distincts.

L'abandon du seul job technique gelé est autorisé même avec gate OPEN, après
ces contrôles. Suivre les étapes 1 à 6 pour arrêter uniquement les ressources
CAB, déconnecter nativement le broker et purger approbations, journal, job et
autres états techniques dans les deux espaces résolus. Ne pas fabriquer un
gate valide, désarmer artificiellement le job, fermer ou redémarrer OpenCode.
Cet arrêt technique exceptionnel ne prétend pas réussir `/cab stop` normal.

Aux étapes 7 et 8, créer une nouvelle session et un nouveau job technique avec
identifiants neufs de session, job, requête et approbation. Conserver le change
attendu et les critères du checkpoint, jamais le change divergent. Le prévol
exact `/usr/bin/true` exige décision explicite, réponse MCP corrélée,
consommation native unique, exit 0 et readiness finale READY sans demande ni
permission parasite.

Un nouveau prévol divergent interdit la reprise métier et relance cette
procédure si les mêmes préconditions de sûreté sont à nouveau prouvées.
Le RUN parent reste en attente non terminale. Tracer chaque tentative dans
le checkpoint : numéro, identifiants, horodatages, cause, arguments attendus
et observés et références des preuves natives. Renouveler les tentatives
sans limite tant que les préconditions restent prouvées, jusqu'au prévol
exact réussi ou à l'arrêt explicite du développeur. Ne lancer aucune tentative
simultanée ni dupliquer une tentative non réconciliée ; maintenir le suivi
de progression à la cadence existante, sans boucle serrée.

Réconcilier ensuite les fichiers et les preuves externes, puis reprendre au
premier jalon non prouvé, sans rejouer les écritures validées ni les décisions
consommées. Ne réadopter ni ancien job ni ancienne session. Une preuve absente
n'autorise aucun rejeu aveugle ; conserver le blocage concerné et demander
l'autorité indispensable. Les permissions de la plateforme restent requises.

La purge ne constitue jamais une approbation d'action et ne rejoue aucune
décision. La persistance et la reprise après crash restent applicables pendant
le RUN courant hors cette exception strictement bornée. Les statistiques d'une archive doivent être publiées avant sa
clôture ; un rapport existant n'appartient pas à l'état technique à purger.
