# Préservation et réparation — CAB2.4.15

Avant un effacement, vérifier la préservation des valeurs appartenant aux RUN protégés même si leur clé est une identité secondaire cible. Un contrôle d’absence n’autorise pas la disparition d’un pair. Après un échec du différentiel, suspendre les nouvelles purges et la restitution de succès ; conserver les progrès des pairs.

Le module publié `cgpt-approval-bridge-preservation-repair.mjs` fournit `planProtectedRepair(snapshot, baseline, copies)`. Les copies doivent correspondre exactement aux empreintes d’origine ; seuls les RUN protégés et les entrées manquantes sont concernés. Les accès restaurés sont exclusivement RELEASED/CANCELLED sans token. Les opérations conservent leurs états et once originales. Un objet existant divergent est refusé, jamais remplacé. Le plan est sans écriture ; appliquer avec l’autorité exclusive du lecteur de registre réellement actif, ses validations et sa persistance atomique. Capturer une nouvelle preuve de préservation complète. Aucune commande métier, permission ou once n’est émise.

## Demande globale technique résolue

Une demande DRAINING GLOBAL_RECONCILIATION émise par technical-integrity-protection n’est pas une lease acquise. Après résolution vérifiée de l’intégrité, elle peut créer une impasse si les réconciliations locales sont bloquées par ce gel. `planResolvedIntegrityRelease` est limité à cette classe : même transaction/génération, autorité et preuves applicables, deux observations natives stables, broker READY/NONE de même instance et reçu depuis moins de45secondes, zéro activité/permission et registre exact inchangé. GLOBAL_STOP/PAUSE, SHARED_MAINTENANCE, HELD, preuve périmée ou différence de frontière sont refusés.

Cette opération libère uniquement la demande globale : tous les accès, baux, opérations, décisions et fences restent identiques, y compris les protections locales non réconciliées. L’orchestrateur applique ensuite leurs procédures owner ordinaires. Aucun accord humain supplémentaire n’est demandé dans le mandat déjà accordé ; les preuves manquantes ne sont pas inventées.

Pour une application hors ligne, garder les services actifs pendant la préparation, puis utiliser le transport scellé pour une coupure du seul contrôleur, prendre l’autorité exclusive, revérifier les observations et l’empreinte, valider et persister le plan, réancrer le même transfert sur le registre résultant et renouveler son délai sous identité native inchangée. Vérifier continuité ADOPTED, préservation puis CABU final. Les anciens UID/services, secrets et configurations OpenCode ne sont pas modifiés.

## Sérialisation du plan de libération

`resolvedWithoutAcquire` est une annotation du reçu opérateur ; le lecteur du registre n’accepte pas ce champ dans le global persistant. Le consommateur garde cette annotation dans son reçu et transmet seulement les champs du schéma au lecteur :

```javascript
const {resolvedWithoutAcquire, ...global} = plan.next.coordination.global;
receipt.globalReleaseAnnotation = {resolvedWithoutAcquire};
plan.next.coordination.global = global;
registry.validateResourceState(plan.next.coordination);
```

Le contrôle du lecteur et la persistance atomique restent obligatoires. La normalisation ne retire aucun champ métier, preuve, état, accès ou fencing.
