# Récupération par RUN — CAB 2.2.40

Dans le change déjà validé, l’orchestrateur décide et valide les reprises ; le
développeur est sollicité uniquement pour une décision hors de ce périmètre.
Une preuve technique manquante reste à diagnostiquer. Voir les voies qualifiées
et leurs reçus dans [autonomous-recovery](autonomous-recovery.md).


Un incident de transport n'est pas un résultat métier. Lire d'abord
GET /runs/<run_id>/recovery : cet aperçu ne décide ni ne libère rien. Il expose
la frontière courante, les ressources, actions qualifiées et preuves manquantes.
Les travaux disjoints déjà autorisés peuvent continuer. Un défaut privé d'un
RUN ne bloque pas les autres RUN ; une corruption commune du registre conserve
la protection globale jusqu'à réconciliation de son intégrité.

Le propriétaire peut déléguer les récupérations prévues par son mandat via
POST /runs/<run_id>/recovery/policy, avec policyId immuable, ownerId, version,
actions, resources et référence authorization de l'accord applicable. Cette
politique ne crée aucune autorisation métier ni dérogation aux permissions.
Elle reste liée au RUN, contexte et version ; un changement requiert une
politique neuve. Aucun accès d'un autre propriétaire n'est délégué implicitement.

Le [retrait APPROVED/HELD](approved-held-retirement.md) utilise la clôture ordinaire `/locks/release` avec
RECONCILED, sous décision du propriétaire. Ce n’est pas une nouvelle action
de cette policy ; ne pas la remplacer par withdraw-unissued ou cancel-waiting.

| Action qualifiée | Route existante et preuve conservées |
|---|---|
| cancel-reviewed-validation | /validation/cancel-reviewed ; revue bornée, aucune once consommée |
| reconcile-quarantined-port | /locks/reconcile-quiescent-port ; deux sondes natives et historique non observé conservé |
| reconcile-test | /test-resources/reconcile-restored |
| reconcile-access | /locks/reconcile-restored ; la cible est accessId |
| quarantine-port | /locks/quarantine-timeout ; aucun effet déclaré terminé |
| release-access | /locks/release ; accès HELD non restauré/non quarantiné, membres terminaux et gardes ordinaires conservés |
| release-test | /test-resources/release ; seulement les effets du bail |
| cancel-waiting-test | /test-resources/cancel |
| cancel-waiting-access | /locks/cancel ; WAITING ou STALE selon ses gardes |

POST /runs/<run_id>/recovery/action contient actionId immuable, ownerId,
policyId, boundaryDigest actuel, action, targetId et input correspondant à la
route qualifiée. Employer le header x-cab-continuity: cab-continuity-v1,
origine loopback et JSON, comme pour la politique. Le contrôleur fournit les
tokens internes ; ne pas les recopier dans les messages, checkpoints publics
ou input de récupération. Une URL arbitraire, une cible étrangère, un périmètre
élargi, un reçu réutilisé différemment ou une frontière périmée sont refusés.

Les contrôles natifs des routes restent exécutés. Une politique ne permet ni
NO_EFFECT sans preuve, ni suppression de protection UNKNOWN, ni nouvelle
once pour une permission consommée. Une compensation ayant un effet métier
requiert son nouveau mandat unitaire et ses ressources ; elle n'est pas une
réparation implicite. La décision humaine réellement nécessaire reste visible,
avec la preuve manquante et les actions indépendantes encore possibles.

Le reçu est persisté avant l'action, puis complété avant l'accusé HTTP. En cas
de réponse perdue, lire GET /runs/<run_id>/recovery/receipts?actionId=<id> et
reprendre le même reçu. Un résultat déjà qualifié n'est pas réexécuté. Une
frontière post-crash non démontrée renvoie outcome-unverified : inspecter l'état
autoritaire et ne pas attribuer une causalité inventée à l'action. Le reçu
public filtre tokens, commandes et textes privés.

Si le contrôleur est indisponible, vérifier son service et l'identité du paquet
par la procédure CAB autorisée. Ne pas éditer le registre privé pour simuler
la récupération. Conserver l'intention, les preuves et les effets connus ;
un simple redémarrage n'autorise pas le rejeu d'une opération.

Le [shell approuvé sans accès](approved-shell-retirement.md) emploie, lorsque ses préconditions sont prouvées,
les routes ordinaires acquire/release ; aucune nouvelle action policy
n’est créée et les gardes d’accès restent opposables.

Shell refusé avant once attaché à un parent HELD : [retrait ciblé](approved-attached-shell-retirement.md). Conserver le parent et ses autres effets.

NOT_ADMITTED natif et préparation sans décision : [retrait qualifié](not-admitted-retirement.md). Une absence temporaire de readiness donne503, pas une incompatibilité de contrat.

## Libérer un accès après perte de token par compactage

La policy propriétaire peut autoriser release-access pour le seul accès exact
du même RUN/contexte/version. GET recovery propose cette action pour un parent
HELD non restauré, non quarantiné et dont tous les membres sont terminaux.
Une offre ne prouve pas que les effets/nettoyages sont qualifiés : la libération
ordinaire conserve ses contrôles et la décision appartient au propriétaire.

POST recovery/action utilise ownerId, policyId, actionId neuf, boundaryDigest
frais, action="release-access", targetId=<accessId> et
input={outcome:"COMPLETED" ou "RECONCILED",evidence:[preuves réelles]}.
Le contrôleur lie version, opération, token et fencing en interne, sans GET
secret, restauration fictive, reconstruction du payload initial ni rotation.
Ne pas fournir de token ou d’empreinte interne. NO_EFFECT n’est pas offert par
cette voie. COMPLETED ne devient pas une publication ; RECONCILED ne transforme
pas un ancien échec, timeout ou nettoyage inconnu en succès.

L’empreinte complète de l’accès est liée à l’action et recontrôlée avant/après
les lectures natives. Une nouvelle opération, modification de membership,
quarantaine/restauration, SID actif, permission, mandat courant, résultat natif
divergent ou effet inconnu refuse la clôture. Les once et résultats historiques
restent exacts. Le reçu public ne contient aucun token ; après réponse perdue,
relire le même actionId, sans lancer une seconde libération. Une intention
sans preuve d’effet reste outcome-unverified. Un releaseDigest exact permet
la reprise du reçu après crash, sans rejouer l’effet ni réexposer le secret.
Les baux de test et autres accès ne sont pas libérés par cette action.

Token perdu, accès HELD dédié à un seul edit/shell refusé avant once :
[retrait puis libération propriétaire](approved-attached-shell-retirement.md#accès-dédié-à-un-seul-membre-refusé-avant-once), deux reçus et gardes conservées.

Remédiation COMPLETED avec livraisonfalse : [distinguer exécution et résultat vérifié](technical-recovery.md#résultat-vérifié-dune-réconciliation-de-notification), sans consommer un nouveau budget à l’aveugle.

Depuis2.4.11, release-access peut aussi être offert pour un parent HELD non
restauré/non quarantiné dont les membres sont terminaux ou PREPARED sans
aucune entrée native/nativeResult. Pour ces membres non émis, seul RECONCILED
est admis. Les gardes ordinaires restent exécutées : mandat clos, SID idle,
zéro permission, même owner/contexte/génération et aucune once/intention. Le
contrôleur prend le token en interne ; ne jamais le restituer dans une sortie
de commande. Un accès restauré passe d’abord par sa réconciliation qualifiée.

La réconciliation d’un accès restauré ne doit pas s’auto-bloquer sur ses
propres validations APPROVED non émises. Le contrôleur exclut de ce seul test
les demandes PREPARED enregistrées du même RUN/contexte, sans native, résultat
ou once. Il garde les validations non décidées, reconciling/unmatched, mandats
et effets inconnus comme blocages ; les deux frontières natives et empreintes
d’accès restent vérifiées. Cela ne retire ni ne consomme les approbations.
