## Autorité et phases

Le profil ajoute une exception explicite au contrat HELD avant arrêt :
PREPARED → DRAINING → BOOTSTRAP_HELD → STOPPED → INSTALLED → RESTARTED →
ADOPTED → VERIFIED → COMPLETED. BOOTSTRAP_HELD réside dans un journal privé
et ne modifie pas l'état DRAINING du contrôleur original. L'ancien refus
normal reste observé. Aucune copie ou relance manuelle ne remplace ce chemin.

Une preuve cumulative lie autorisation, transaction, génération de maintenance,
manifeste source/destination, PID et dates de naissance des processus,
réservations, jobs et préfixes natifs. Le profil n'accepte qu'une récupération
préparée sans outil natif dans la candidate, demande PENDING exacte, propriétaire
et opération PREPARED concordants, aucun accès/permission/effet incertain.
Les pairs doivent être quiescents sans validation pendante. Une dérive refuse.

L'outil partage le verrou de l'updater. Les journaux 0600 et dossiers 0700
restent privés hors workspace. OC_Codex_MAINTENANCE_STATE_DIR peut sélectionner
ce répertoire contrôlé ; il vaut par défaut le sous-dossier frozen-controller
du magasin privé update du home du contrôleur. Cette configuration ne change
ni les permissions OpenCode ni les chemins de ses sources.

L'adoption lit uniquement le journal de la transaction sous cette racine,
vérifie propriétaire, régularité, empreintes, expiration, disparition de
l'ancien contrôleur, PID du nouveau, code réellement présent et preuve native
actualisée. Le registre reçoit alors son vrai HELD via sa transition normale.
La libération garde la même preuve et ne supprime jamais job.recovery.

## Chargement et repli

Le paquet préparé ferme les imports du contrôleur ; seuls les fichiers
différents de cette fermeture sont remplacés pendant l'arrêt. Le superviseur
est suspendu par son unité gérée pour supprimer les relances en vol. OpenCode,
broker et Web restent ouverts et leurs identités sont recontrôlées. Aucun
connect/disconnect MCP ou instance/dispose n'est permis par ce profil.

Un repli restaure seulement les artefacts de code, jamais un état métier.
Le contrôleur original peut rester sous DRAINING : le bilan est alors
ROLLED_BACK_FROZEN et ne promet aucune levée du gel. Après un reçu L1
REJECTION_ONLY, le retour à un lecteur incompatible est interdit.

## Qualification

La fixture démarre sur les modules originaux 1.7.1 épinglés par empreintes,
crée réellement la récupération et son orphelin via un broker stdio isolé,
observe le refus ancien, puis exécute l'outil L2. L'adaptateur de services
agit uniquement sur les vrais processus de fixture. HTTP n'invente aucun
HELD. La nouvelle capacité et les empreintes chargées sont contrôlées avant
réconciliation L1, rejet explicite, polling MCP puis retry préservé.
