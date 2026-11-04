# Shell APPROVED refusé attaché à un parent HELD — CAB 2.2.22

Le propriétaire traite ce cas dans le périmètre validé sans solliciter le
correcteur. Le parent peut protéger un effet antérieur incertain : ne jamais
le libérer ni le réconcilier pour débloquer une sous-opération non commencée.
Le retrait concerne la coordination seule, pas la qualification métier.

## Frontière requise

Relire admission, opération complète, parent et job. Exiger l’enfant
PREPARED/APPROVED sans native/nativeResult/once ; un seul parent HELD, même
RUN/contexte/version et toutes ses opérations du même SID courant, contenant
l’enfant et au moins une autre opération. Le manifeste de l’enfant doit
rester couvert par le parent ; aucun jeton ou fencing ne doit être recopié
au modèle. Une opération historique peut rester protégée et incertaine.

GET `/runs/<run>/recovery/native-evidence?operationId=<enfant>` doit montrer
un unique shell correspondant exactement à commands[0], error/aborted,
executed=false, son reçu privé reject ACKNOWLEDGED HTTP204 lié au même
processus/version, SID, directory, call, permission et empreinte de commande.
SID idle, permissions0, absence de troncature et d’effet supplémentaire sont
obligatoires. L’approbation du mandat reste distincte du refus natif.

## Retrait propriétaire avec la route existante

Clore le mandat courant par `/job/progress` lorsque son rapport est acquis ;
aucun nouveau prompt natif n’est nécessaire pour le retrait. Lire la policy
et GET `/runs/<run>/recovery`. Si nécessaire, établir une policy propriétaire
courante via POST `/runs/<run>/recovery/policy`, avec un policyId neuf,
ownerId/version exacts, actions `["withdraw-unissued-validation"]`, ressources
couvertes et justification dans le change autorisé. Une policy manquante est
un cadrage de l’orchestrateur, pas une demande humaine dans ce périmètre.

POST `/runs/<run>/recovery/action` :

```json
{
  "actionId": "identifiant-neuf-du-retrait",
  "ownerId": "proprietaire-courant",
  "policyId": "policy-courante",
  "boundaryDigest": "digest-du-plan-courant",
  "action": "withdraw-unissued-validation",
  "targetId": "operation-enfant-refusee",
  "input": {
    "nativeBoundaryDigest": "digest-du-diagnostic-courant",
    "evidence": ["checkpoint/revue-du-refus"]
  }
}
```

Ces valeurs illustratives ne sont pas un payload exécutable. Le contrôleur
vérifie deux observations natives stables et la frontière du parent avant de
retirer la réponse exécutable locale puis annuler la seule coordination.
Ne pas utiliser locks/release, cancel_approval sur APPROVED, une autre
ressource artificielle ou un autre SID. Un refus doit être diagnostiqué,
pas contourné ; aucune permission once ne vient de ce retrait.

## Vérification et poursuite

Exiger enfant CANCELLED, APPROVED et liens historiques conservés, sans
native/nativeResult/once créés. Vérifier parent strictement identique : HELD,
jeton/fencing, ressources, révisions, autres opérations et baux. Le contrôleur
ne qualifie pas la fin métier du parent ; exit124 reste un échec/timeout.
Une permission tardive de l’enfant ne doit jamais recevoir once.

Après perte de réponse ou redémarrage, relire/répéter le même actionId et
payload pour retrouver le reçu, sans nouveau refus natif ou rejeu. Le lien
à l’accès reste historique, il n’est pas supprimé du registre.

Préparer ensuite le nettoyage ou diagnostic par un mandat neuf : IDs,
empreintes, révisions, décision et rattachement ordinaires au parent exact.
Le staging n’est débloqué que si aucune autre validation/effet ne l’interdit.
Ne pas relancer l’ancien shell composite ; le porte-mandat scellé évite une
nouvelle permission fragmentée. Si la frontière n’est pas qualifiée, conserver
les protections et signaler la preuve manquante. Une extension métier reste
soumise au développeur.
