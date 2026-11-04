# Shell APPROVED refusé avant once, sans accès lié — CAB 2.2.21

Dans son change déjà autorisé, l’orchestrateur propriétaire traite lui-même
ce cas. Il conserve RUN, SID, décision et identifiants ; il ne sollicite pas
le correcteur pour composer les routes ordinaires à une frontière prouvée.
Ce parcours est conditionnel, pas un retrait universel des shells approuvés.

## Identifier exactement la frontière

Relire admission/décision, opération, job, ressources/révisions et diagnostic
natif. Exiger PREPARED/APPROVED, aucun accès lié, aucune intention native,
once ou nativeResult de l’opération. Un shell error/aborted, executed=false,
refusé avec reçu reject/ACKNOWLEDGED/HTTP204 exact, est une preuve distincte
de la décision de mandat APPROVED ; ni l’un ni l’autre n’est NO_EFFECT.
Le reçu doit correspondre au SID, call, permission, cible et processus natifs.
Une donnée absente ou ambiguë ne suffit pas à exclure un effet.

Depuis2.2.19, `withdraw-unissued-validation` couvre aussi le shell exact
refusé avec ACK204 et deux frontières stables. Privilégier cette route qualifiée
après diagnostic et revue propriétaire, plutôt que créer un accès pour retirer.
Si le shell est attaché à un parent HELD protégeant d’autres opérations, suivre
[le retrait ciblé](approved-attached-shell-retirement.md), sans libérer le parent.
La composition ordinaire ci-dessous conserve ses conditions strictes.
`cancel-reviewed-validation` exige sa preuve native/broker d’annulation ;
un broker APPROVED non annulable ne devient pas CANCELLED par déclaration.
Ne pas répéter cancel_approval refusé, inventer un rejet de mandat ni corriger
rétroactivement tool_input_sha256 ou le payload approuvé pour pouvoir exécuter.

## Décider si la composition ordinaire est admissible

Elle est admise seulement si :

- l’unité reste dans le même RUN/contexte/version, avec approbation durable ;
- son manifeste exact est encore admis, ses révisions sont courantes et ses
  ressources sont disjointes des protections historiques incompatibles ;
- aucun accès n’a déjà été créé pour son accessId, et aucun effet ou permission
  n’est en cours pour cette unité ;
- le mandat courant est clos après son rapport, le même SID est idle, sans
  permission en attente, sans relance de l’ancien shell ;
- l’orchestrateur a examiné et consigné le retrait dans son checkpoint autorisé.

Si le manifeste est périmé, recouvre une protection, nécessite une réservation
non qualifiée ou si une garde refuse, ne pas élargir le scope, changer les
révisions ou créer une ressource artificielle. Garder les protections,
examiner le refus exact et les voies déjà qualifiées. Une vraie lacune exige
son correctif SCM ; la permission humaine n’est requise que hors mandat.

## Acquérir uniquement pour clôturer, sans exécuter

L’orchestrateur ferme currentCabMandate par `/job/progress` avec la chaîne
vide après le compte rendu. Il ne transmet aucun nouveau prompt ou shell.
Il envoie `POST /runs/<run>/locks/acquire` en conservant :

```json
{
  "version": 123,
  "operationId": "accessId-de-l-unite-deja-approuvee",
  "operationDigest": "empreinte-deja-approuvee",
  "resources": [{"key": "resource:preflight", "mode": "read"}],
  "expectedRevisions": {"resource:preflight": 0}
}
```

Les valeurs illustratives ne remplacent pas le manifeste existant. Lorsque
access_id était omis de la validation, le défaut est son operation_id ; sinon
employer l’accessId explicite et vérifier toutes les sous-opérations liées.
Ne créer ni nouveau requestId/approvalId/opération ni nouvelle approbation pour
cette seule coordination. Une base périmée ou un scope divergent est refusé.

Exiger HELD sur le seul ensemble examiné. WAITING ne prouve aucune acquisition
et n’autorise ni effet ni libération HELD ; STALE exige sa procédure dédiée.
L’acquisition ne vaut pas permission native : ne jamais exécuter la commande
obsolète et ne pas répondre once directement. Le même shell composite ne
doit pas être relancé pour obtenir un autre résultat de permission.

Dans le traitement local privé, conserver token/fencing sans les afficher
au modèle, en arguments de commande, dans les journaux ou checkpoints. Vérifier
à nouveau le SID idle et permissions0, puis employer la clôture ordinaire
`POST /runs/<run>/locks/release`, avec version/accessId/token/fencing exacts,
`outcome: "RECONCILED"` et références de la revue/retrait. Suivre les gardes et
la gestion privée décrites dans [retrait HELD](approved-held-retirement.md).
Ce n’est pas une nouvelle action recovery/policy ni un nouvel argument `/CAB`.

## Vérifier le résultat et reprendre

Exiger l’ancienne opération CANCELLED, son accès RELEASED/RECONCILED et sa
décision APPROVED historique conservée. Aucun native/once/nativeResult ne
doit avoir été créé. La seule clôture d’une unité jamais émise ne modifie
pas sa révision. Vérifier séparément que les autres accès, baux, fencing
et anciennes once sont conservés ; ne pas les libérer pour ce retrait.

Après une réponse perdue, lire les états autoritaires et reprendre seulement
le même payload privé/identifiant d’accès ; ne pas fabriquer de nouvel ACK ni
recréer la validation. Si une acquisition existe déjà, ne pas en construire
une variante : qualifier cet accès puis suivre la voie HELD appropriée.

Relire la readiness scoped au RUN. Si un compteur pending/BLOCKED demeure,
identifier la demande qui le produit ; le retrait n’exige pas que le broker
réécrive l’ancien APPROVED en CANCELLED et ne prouve pas l’absence d’une autre
demande. Ne pas redémarrer le runtime ou changer le SID pour effacer le compteur.

La future sonde ou correction exige une unité, des identifiants, empreintes,
révisions, décision et accès neufs. Conserver les critères et protections du
change ; un retrait de coordination ne constitue pas une validation métier.

## Qualification de la composition

Un registre jetable CAB2.2.15 a qualifié le parcours : nouvelle unité APPROVED
sans accès sur une ressource read disjointe, acquisition HELD puis clôture
RECONCILED ; CANCELLED/RELEASED, APPROVED conservé, aucun native/once/result,
révision inchangée. Deux protections historiques après handoff, dont un ancien
once ACK sur port write, restent strictement identiques. Une permission tardive
de l’unité clôturée est refusée. Cette qualification ne remplace pas la revue
native et les gardes de l’orchestrateur sur le RUN réel.
