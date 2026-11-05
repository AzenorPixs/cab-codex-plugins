# Shell ou edit APPROVED refusé attaché à un parent HELD — CAB 2.2.39

Le propriétaire traite ce cas dans le périmètre validé sans solliciter le
correcteur. Le parent peut protéger un effet antérieur incertain : ne jamais
le libérer ni le réconcilier pour débloquer une sous-opération non commencée.
Le retrait concerne la coordination seule, pas la qualification métier.

## Frontière requise

Relire admission, opération complète, parent et job. Exiger l’enfant
PREPARED/APPROVED sans native/nativeResult/once ; un seul parent HELD, même
RUN/contexte/version et enfant du SID courant, dont operationIds contient soit l’enfant et au moins une autre opération,
soit uniquement l’historique du parent si l’enfant ne fait que le référencer.
Dans ce second cas, aucun autre accès ne doit contenir l’enfant ; la référence
reste inchangée, sans rattachement rétroactif. Le manifeste de l’enfant doit
rester couvert par le parent ; aucun jeton ou fencing ne doit être recopié
au modèle. Une opération historique du même SID peut rester protégée et incertaine.
L’unique exception pour un autre SID est un historique CANCELLED sans native,
nativeResult ni onceAcknowledged=true, toujours dans le même RUN/contexte/version.
Un ancien SID actif ou porteur d’un effet reste inadmissible.

GET `/runs/<run>/recovery/native-evidence?operationId=<enfant>` doit montrer
un unique shell correspondant exactement à commands[0], ou un edit ou write V2 visant
le fichier unique approuvé, error/aborted,
executed=false, son reçu privé reject ACKNOWLEDGED HTTP204 lié au même
processus/version, SID, directory, call, permission et empreinte de commande.
Pour l’edit, la preuve doit satisfaire rejectedEditWithdrawalProof : input
path/oldString/newString/replaceAll exact observé, digest de part et reçu
privé lié à la cible, au call et à l’input natif. Le rejet permet seulement le
retrait ; il ne rend pas exécutable l’input divergent. SID idle, permissions0, absence de troncature et d’effet supplémentaire sont
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

## Après un historique de SID différent

Le retrait ne modifie pas la garde session-handoff-historical-access-protected
à l’émission native. Ne pas en déduire qu’une nouvelle édition peut exécuter
sur ce même accès historique. Après retrait, le propriétaire examine séparément
la clôture ordinaire de cet accès si toutes ses opérations sont annulées sans
effet, puis prépare un mandat et un accès neufs sur les révisions courantes.
Cette clôture possède ses preuves propres ; elle n’est pas effectuée par le
retrait et ne libère aucun autre parent, bail ou effet incertain.

## Lectures natives sans mutation après le rejet

Un read V2 terminé, executed=false, non tronqué, avec provenance dérivée du
nom d’outil natif, path non vide et éventuelle fenêtre offset/limit valide,
est une observation ; il ne devient pas un deuxième effet candidat.
La fenêtre est bornée à offset entier sûr positif ou nul et limit entier sûr
strictement positif. Les seules clés admises sont path, offset, limit.
Cette qualification ne permet aucune lecture hors mandat et ne transforme
pas un autre outil ou un wrapper JavaScript opaque en lecture sûre.

Read actif/échoué/executed=true, troncature, provenance absente, clé inconnue,
outil imitant read, shell/write/edit supplémentaire restent à qualifier.
Le contrôleur doit toujours prouver l’unique edit/shell refusé, ACK204, zéro
permission et deux frontières stables ; parent et autres protections restent
inchangés. Après un reçu terminal409 de retrait, conserver ce reçu et préparer
une action neuve sur les preuves fraîches corrigées ; ne pas réémettre l’effet.

## Parent référencé sans liaison effective

La même voie withdraw-unissued-validation traite le shell ou edit refusé
avant once dont accessId référence ce parent HELD sans appartenance à ses
operationIds. L’orchestrateur n’attache pas l’enfant pour permettre son retrait.
Le contrôleur conserve tous les membres historiques, le parent et ses preuves.
Un terminal de lecture reconcile-reviewed-terminal ne s’applique pas à un edit
refusé : la présence d’une offre générique ne qualifie jamais cette preuve.
Le rejet ACK204 est observé dans le journal, jamais inventé par l’orchestrateur.
Après retrait, exiger CANCELLED, APPROVED historique, native/nativeResult/once
absents, operationIds/parent/révisions/baux identiques. Si une réponse est perdue,
relire le même actionId ; la reprise est durable sans second reject ou once.

Une différence de fin de ligne entre l’input approuvé et celui réellement
présenté reste une divergence : aucun digest n’est normalisé. Corriger seulement
la prochaine unité neuve après revue de son input exact et des révisions fraîches.

## Accès dédié à un seul membre refusé avant once

Le même retrait propriétaire couvre l’accès HELD non restauré/non quarantiné
dont accessId égale l’operationId et operationIds contient exactement ce seul
membre PREPARED/APPROVED. Le token peut être absent du contexte après compactage.
La preuve reste un unique shell/edit refusé, aborted/executed=false, rejet
privé CAB ACKNOWLEDGED HTTP204 exact, même SID idle et zéro permission, sans
native/nativeResult/once. La divergence d’input n’est jamais rendue exécutable.

1. Relire job/admission/opération/accès puis preuve native de refus. L’accès
   doit appartenir au même RUN/contexte/version et couvrir les ressources.
2. Établir au besoin une policy owner courante avec withdraw-unissued-validation
   et release-access dans le mandat existant, sans nouvelle question humaine.
3. Avec plan et nativeBoundaryDigest frais, appliquer withdraw-unissued-validation
   sur l’operationId et conserver son reçu. Le contrôleur relit deux frontières
   et l’empreinte du parent ; seul le membre devient CANCELLED, APPROVED reste
   historique. L’accès, token/fencing, membership, révisions et baux sont inchangés.
4. Relire l’état et GET recovery. release-access n’est proposé qu’après ce
   retrait et sous ses propres gardes ; le propriétaire peut alors demander
   outcome RECONCILED avec ses preuves, sans token reconstruit ou exposé.
5. Exiger deux reçus distincts : CANCELLED puis RELEASED/token absent, aucune
   once/nativeResult nouvelle et protections indépendantes conservées. Après
   réponse perdue, relire le même actionId ; ne rejouer ni reject, ni edit.

Restauré/quarantiné, membre ou accès étranger, SID/version/contexte divergent,
effet natif, once, ACK manquant, cible différente, outil supplémentaire ou
frontière changée restent refusés. Si un redémarrage non certifié intervient
entre les deux étapes, la garde restored reste applicable : ne pas forcer une
libération ordinaire. Ni le retrait ni RECONCILED ne valent succès de l’édition.

## Write V2 refusé sous permission edit

OpenCode peut présenter une permission de catégorie edit pour une part native
write. Cette part reste write, nativeTool=write, nativeFormat=opencode-v2 ;
son schéma qualifié est exactement {path,content}, deux chaînes, sans alias
ni clé supplémentaire. L’edit conserve son propre schéma fermé
{path,oldString,newString,replaceAll?}. Aucun write n’est converti en edit.

Le diagnostic native-evidence doit montrer le call write et son digest d’input
ainsi que le reçu SDK lié au même call/permission. Une couverture absente dans
le journal événementiel reste MISSING_RELEVANT_CALLS ; elle n’efface pas le call
ni le reçu privé et ne devient jamais une preuve NO_EFFECT.

Le retrait exige toujours la cible unique approuvée exacte, le digest du corps
natif observé et le digest de part exacts, distincts du digest approuvé, puis
l’ACK204 de rejet CAB_CLIENT_PROGRAMMATIC lié au même PID/version/SID/directory,
call, permission et cible de catégorie edit. Error/aborted/executed=false seul
ne suffit pas. SID idle, permission0 et deux frontières natives identiques
restent obligatoires. Contenu/chemin/fins de ligne ne sont jamais normalisés.

La voie existante withdraw-unissued-validation couvre ce format sur les mêmes
frontières dédiées, attachées ou seulement référencées admissibles. L’enfant
seul devient CANCELLED ; APPROVED historique et parent/protections restent
inchangés, aucun native/nativeResult/once ou fichier écrit n’est inventé.
release-access reste une seconde action distincte après état terminal.

Avant reprise après cette évolution de projection, relire plan et native-evidence
frais. Ne pas réutiliser un ancien digest qui omettait write, ni un actionId
ayant déjà rendu409 : conserver ce reçu et choisir une action neuve après revue.
Après réponse perdue d’une même action, relire son reçu exact sans nouveau
reject, write ou once. ACK absent/non204, call supplémentaire, cible/empreinte
ou identité divergente restent refusés ; les autres gardes de parent s’appliquent.
