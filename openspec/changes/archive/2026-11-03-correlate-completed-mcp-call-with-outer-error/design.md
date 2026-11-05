# Séparer observation d’appel et issue métier

Un wrapper completed avec error=true peut contenir un appel request_validation
completed dont les inputs natifs restent vérifiables. Cette observation n’est
ni une réussite d’édition ni une autorisation : le contrôleur admet seulement
la demande sous ses gardes ordinaires. Une décision propriétaire et un accès,
puis la permission exacte transmise par le contrôleur, restent nécessaires.

Les valeurs incohérentes, entrées divergentes, troncatures et appels exécutants
supplémentaires restent refusés. Un JSON natif NOT_ADMITTED de la même identité
est terminal et n’est pas réadmis ; sa présence finale ne prouve pas à elle seule
l’état observé lors de la notification initiale. Le codage soumettra des identités
neuves et un payload littéral direct après revue des révisions et du hash exact
de l’input d’édition, sans transformer le résultat MCP ou rejouer l’ancien ID.

Les phases du wrapper et du call MCP sont deux observations asynchrones. La
corrélation brute reconnaît leurs phases connues running/completed/error et
un marqueur error absent ou booléen, sans les utiliser comme autorité. La
matrice27combinaisons est vérifiée ; les types/phases inconnus restent refusés.

## États privés CAB2.2.7 et fichiers projet0775

Les fichiers de projet conservent leurs droits0775, y compris après DIU.
Le contrôleur, le superviseur et les reçus de rejet utilisent désormais
`<home exécution>/.local/state/cab-approval-bridge/<SHA256 du workspace résolu>/cgpt-approval-bridge/`.
Les répertoires privés sont0700 et les fichiers0600. La racine optionnelle
`OC_Codex_RUNTIME_STATE_ROOT` (alias historique `OC_CGPT_RUNTIME_STATE_ROOT`
seulement si le nom principal est absent) remplace `.local/state` ; elle doit
être absolue, hors projet et protégée. Le broker conserve son magasin de profil
hors projet. `/status` expose `runtimeStateDirectory` ; ne pas deviner ce chemin.
Seul le verrou public de coordination reste dans le projet en0775, pour
exclure une ancienne instance ; il ne contient aucune décision ou secret.

Le premier CABU depuis2.2.6 vérifie le registre source et le transcript des
validations actives, puis copie les seuls états CAB connus sans changer les
anciens fichiers. Le reçu `cab-private-state-migration-v1` garde explicitement
la continuité LEGACY, sans certificat source inventé. Le contrôleur démarre
avec les mutations et permissions suspendues ; CABU vérifie versions, identité
native, RUN, opérations et once, puis active le reçu exact de façon idempotente.
Une interruption après copie reprend en avant avec le même reçu et le même
stockage privé ; revenir aux anciens fichiers de projet est interdit. Les
anciennes protections incertaines restent en place, sans once ni commande rejouée.
Les mises à jour suivantes utilisent de nouveau le transfert certifié ordinaire.

La qualification couvre la demande absente du checkpoint, le maintien0775,
le refus de symlink/permission native avant coupure et la reprise après échec
de démarrage. La capture comporte les identités des opérations et once déjà
acquittées ; aucune donnée runtime réelle n’est versionnée.
