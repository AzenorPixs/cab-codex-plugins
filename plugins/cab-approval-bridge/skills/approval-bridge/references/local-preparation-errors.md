# Préparer sans faux blocage local — CAB 2.2.40

Pour un payload généré ou un rapport de build, suivre [la prévalidation par couche](generated-payload-validation.md) avant staging.

## Comparer les bonnes données

Séparer trois objets : arguments du MCP, descripteur du stage, checkpoint de
l’orchestrateur. Le checkpoint peut contenir stageId, payloadSha256, sourceSha256,
state, createdAt et reçus ; ils ne deviennent pas des arguments request_validation.
Comparer les arguments natifs au manifeste de demande revu, avec le schéma
courant. Lister clés manquantes/supplémentaires, types et champs divergents.
Pour commands[0], comparer octets/longueur/SHA et la command retournée par le
stage. Une comparaison globale contre tout le checkpoint ne qualifie pas une
divergence du codeur. Une véritable divergence de commande, identité, ressource
ou empreinte reste bloquante et suit sa voie qualifiée ; aucun ajustement silencieux.

Un descripteur de shell-stage expose normalement la command de lancement,
avec IDs, taille et empreinte. Cela ne divulgue pas le payload Bash privé.
Ne pas interdire ce champ ni tester l’absence d’une sous-chaîne arbitraire dans
le JSON. Vérifier les clés/valeurs prévues ; réutiliser un stage existant exact,
sans le recréer après un simple échec du lecteur local.

## Empreintes et schémas

Extraire les IDs, boundaryDigest du plan et nativeBoundaryDigest des preuves
par affectation depuis les objets JSON locaux. Ne pas recopier un SHA depuis
un texte assistant, le recalculer sur un autre objet ni confondre ces deux
empreintes. Une inversion de deux caractères conserve le format64hex mais
invalide la preuve. La nouvelle proposition est revue avant tout envoi ; un
reçu existant interdit de changer son actionId/payload pour la faire passer.

lookup_validation accepte les cinq champs canoniques requestId, run_id,
session_id, operation_id, operation_digest. approval_id est retourné et ne figure pas dans les arguments
du schéma. Prélever le digest original, sans le modifier. Une tolérance du
raccord aux champs inconnus n’étend pas le schéma public. Une validation locale
qui échoue avant dispatch ne démontre aucun appel serveur ni incident CAB.

## Préconditions ajoutées et erreurs de lecture

Distinguer gardes normatives et suppositions locales : nativeObservation du
plan reste normalement unverified et snapshot_only=true ; la preuve native
vient d’un endpoint séparé. currentCabMandate vide n’impose pas une forme null
particulière ; utiliser le contrat du champ et l’absence de mandat actif.
Ne pas transformer une métadonnée facultative absente en permission manquante.

SyntaxError, IndentationError, KeyError ou erreur de parsing après POST ne
qualifient pas l’issue serveur. Corriger le helper local, vérifier son schéma,
puis lire le reçu/actionId et l’état autoritaire. Ne pas relancer une mutation
parce qu’un champ de présentation tel que releaseReceiptState est absent.
Les lectures et travaux indépendants autorisés continuent ; les effets inconnus
restent protégés. Ne pas contourner une garde serveur pour corriger un lecteur.

Prélever, sans copie de valeurs opaques, les arguments de lookup depuis la
demande native originale déjà identifiée :

```python
lookup_keys = ("requestId", "run_id", "session_id", "operation_id", "operation_digest")
lookup_args = {key: observed_request[key] for key in lookup_keys}
```

Cet exemple ne crée ni identité ni permission et n’émet aucun appel. Une clé
absente interrompt la préparation et exige sa source originale, jamais une
valeur déduite ou une chaîne recopiée approximativement.

Connaître la forme réellement retournée par le helper HTTP utilisé : ne pas
présumer un wrapper body/data/status ni confondre exit0 du lecteur et succès
métier. Lire les clés filtrées et le reçu structuré selon
[le résultat vérifié](technical-recovery.md#résultat-vérifié-dune-réconciliation-de-notification).

Le plan ne fournit pas nécessairement des booléens eligible/available ;
l’authority de l’offre exacte et les gardes de la route définissent le parcours.
Ne pas exiger un champ inventé tel que releaseReceiptState pour reconnaître
un reçu valide. Une clé manquante dans le helper n’est pas un refus de l’API.
