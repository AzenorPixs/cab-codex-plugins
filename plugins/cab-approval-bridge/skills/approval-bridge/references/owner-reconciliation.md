# Réconcilier et reprendre sans arbitrage hors sujet — CAB 2.2.24

Dans le change et les moyens déjà autorisés, l’orchestrateur propriétaire
examine les preuves, décide la réconciliation qualifiée et poursuit le mandat.
Il ne demande pas au développeur l’autorisation d’appliquer une procédure
existante. Une preuve technique manquante se diagnostique ; elle n’est pas une
décision métier à déléguer à l’humain. Un correctif nécessaire suit le mandat
SCM/version/commit/publication/CABU du correcteur, sans mutation concurrente du RUN.

## 1. Identifier la surface réellement inaccessible

Une page OpenCode demandant un appairage ne prouve pas que l’API native ou le
SID est inaccessible. Utiliser d’abord le client officiel authentifié du plugin
courant, selon [les interfaces](protocol-interfaces.md) : info, session existante,
mcp et statut, sans afficher ni demander le credential. Si ces GET réussissent,
continuer le pilotage via cette API autorisée ; ne pas demander un appairage hôte
pour débloquer ce seul chemin. Ne pas désactiver l’authentification ni recréer
une session. Un échec authentifié réel conserve son diagnostic filtré.

MCP connected ne vaut pas broker_readiness READY. Le prévol MCP réel reste
requis dans le SID selon son mandat, sans shell métier pour découvrir un outil.

## 2. Séparer infrastructure, résumé du RUN et accès exact

`access-reconciliation-required` dans le statut du RUN signifie qu’au moins
un accès actif est marqué restauré. Il ne prouve pas que tous les accès sont
restaurés, ni que le transport est perdu, ni que toute unité disjointe est
refusée. Lire infrastructure_status, contexte/version, accès actif et opérations
liées ; conserver dates et source de chaque preuve. Le résumé peut rester
BLOCKED à cause d’un ancien effet protégé pendant qu’une unité qualifiée progresse.
Cela n’autorise jamais à ignorer une garde réelle de l’opération courante.

Identifier uniquement l’accès nécessaire au prochain mandat : ressource,
accessId, fencing, décision et toutes ses sous-opérations. Ne pas parcourir ni
publier tout l’historique, les tokens ou le ledger. Les procédures d’accès et
leurs preuves détaillées sont dans [concurrent-runs](concurrent-runs.md).

| Frontière vérifiée | Action du propriétaire |
|---|---|
| Accès restauré, ancien token/fencing disponibles | `/locks/reconcile` sous ses gardes ; revoir les PREPARED non commencées qui seront annulées ; même accès HELD avec nouveau token/fencing. |
| Token perdu, même accès HELD restauré | GET `/locks/reconcile-preview?operationId=<accessId>`, vérifier la frontière puis `/locks/reconcile-restored` avec reçu neuf ; doubles observations, quiescence et preuves natives restent obligatoires. |
| Prévol409 access-reconciliation-boundary-required | Vérifier le code et les conditions : cet accès peut ne pas être restauré, ou sa frontière peut être inadmissible. Ne pas forcer une réconciliation ni inventer un nouveau token ; examiner l’accès exact et les voies ordinaires. |
| Accès courant valable, prochain correctif dans son ensemble | Nouvelle décision et `/locks/attach` selon ses gardes ; aucune ressource cachée ni ancienne once réutilisée. |
| Effet EXECUTING/UNKNOWN ou ACK sans preuve terminale | Garder la protection ; employer uniquement la preuve/voie qualifiée, notamment la quarantaine de port si applicable. Idle, timeout ou port fermé ne prouvent aucune fin. |
| Accès/effet ancien sans recouvrement avec l’unité courante | Garder sa protection et poursuivre l’unité indépendante autorisée après ses propres contrôles. Ne pas chercher à effacer BLOCKED en libérant tous les accès. |

Une restitution HELD normale et un retrait avant émission ont leurs conditions
propres : [retrait HELD](approved-held-retirement.md). La réconciliation conserve
HELD ; elle n’est ni une libération ni une validation du résultat métier.
Une fin exit1 peut être établie sans réussite du test. Token et fencing restent
locaux et privés ; les reçus existants se réobservent sans rejouer l’effet.

## 3. Décider et rendre compte

Fermer le mandat courant selon le contrat avant une reprise qui exige une
frontière quiescente. Ne pas exiger idle pour décider une demande ordinaire
qui attend précisément cette décision ; voir [soumission](validation-submission.md).
Après l’action, relire le reçu, l’accès, la génération, le SID et les permissions,
puis poursuivre la prochaine unité autorisée avec ses IDs exacts.

Une garde persistante reçoit un diagnostic borné vers le correcteur CAB : route,
code, cible, date et preuve manquante. Continuer les travaux indépendants permis.
Solliciter le développeur uniquement pour une décision ou capacité effectivement
hors périmètre, après vérification des chemins autorisés ; ne pas lui demander
une confirmation générique pour une réconciliation déjà déléguée.
