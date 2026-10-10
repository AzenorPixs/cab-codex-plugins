# Nouvelle session CAB : purge obligatoire

Exécuter cette procédure avant chaque nouvelle session CAB, même si son ancien
état semble sain, vide ou indispensable à un ancien codage. L'invocation de
`/cab start` autorise cette purge technique sans nouvelle confirmation. Ne pas
la déclencher pour une reprise ordinaire du même RUN, un compactage, une
reconnexion, un nouveau mandat ou change, ni pour `run`, `test`, `update` ou
`stop`. Un prévol de récupération divergent conserve la candidate, le job
et le runtime ; il ne déclenche jamais cette purge.

1. Résoudre la racine du projet et le contexte propriétaire du broker par les
   métadonnées OpenCode. Passer leur `directory` explicitement à toutes les
   requêtes de contexte. Vérifier l'absence de RUN actif ainsi que l'absence
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
   et l'exécution unique de `true` avant tout mandat de travail.

## Prévol de récupération divergent : aucune purge

Conserver la session candidate, le job, le runtime et les preuves. Réconcilier
puis utiliser retry explicite selon la section « Prévol de récupération
divergent dans la même session » de [SKILL.md](../SKILL.md). Un refus de
récupération n'autorise ni nouvelle session CAB ni abandon technique du job.
Un délai MCP seul conserve le polling du même approval_id, sans nouvelle demande.
La purge d'un nouveau RUN reste distincte et conserve toutes les gardes ci-dessus.
Les rapports d'archive restent hors runtime et doivent être vérifiés avant clôture.
