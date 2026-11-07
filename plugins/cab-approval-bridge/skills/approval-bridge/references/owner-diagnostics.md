# Diagnostic propriétaire autonome — CAB 2.2.40

Dans le change autorisé, l’orchestrateur qualifie et décide les récupérations
existantes. Solliciter le développeur pour une décision hors de ce périmètre,
pas pour une policy technique manquante ni pour relire une procédure existante.
Une preuve absente reste à établir ; elle n’autorise jamais un effet incertain.

## Lire seulement le cas utile

| Signal | Référence à charger |
|---|---|
| État busy, monitoring périmé,401 brut, readiness globale ou executed ambigu | [Sources courantes](live-state-sources.md) |
| Policy présente mais action non autorisée | [Couverture de policy](owner-policy-coverage.md) |
| Empreinte, schéma, checkpoint, erreur du helper | [Préparation locale](local-preparation-errors.md) |
| Payload généré, helper embarqué ou JSON de build invalide | [Prévalidation des payloads](generated-payload-validation.md) |
| PENDING après retrait et accès libéré | [Clôture broker](broker-pending-after-withdrawal.md) |
| Révision enfant absente ou shell multiligne/composé | [Soumission](validation-submission.md#révisions-effectives-et-scripts-composés) et [carrier](exact-shell-carrier.md) |
| Accès HELD aux membres terminaux, jeton perdu | [Libération propriétaire](recovery-policy.md#libérer-un-accès-après-perte-de-token-par-compactage) |
| APPROVED/HELD sans once, permission refusée | [Retrait qualifié](approved-attached-shell-retirement.md) |
| APPROVED sans émission, parent seulement référencé puis RELEASED | [Référence libérée](approved-attached-shell-retirement.md#parent-seulement-référencé-puis-released) |
| Autre combinaison d’états | [Grille](pilot-state-matrix.md), [autonomie](owner-reconciliation.md), puis [récupération](recovery-policy.md) |

## Séquence courte

1. Identifier RUN/contexte/version de réservation, SID, request/approval/op et
   version réellement chargée de chaque composant. Distinguer version CAB et
   numéro de réservation ; ne pas comparer1367 à une version logicielle.
2. Lire la source courante du seul cas ; séparer broker, contrôleur, accès,
   permission, appel natif et once. Ne pas inférer un état de l’autre.
3. Nommer la condition exacte manquante, en distinguant garde serveur et
   précondition ajoutée dans un helper local. Comparer les champs utiles,
   pas tout un objet de checkpoint hétérogène.
4. Choisir la voie déjà autorisée, vérifier ses preuves et conserver une
   proposition unitaire. Prendre IDs/digests depuis les réponses JSON locales,
   jamais par transcription de texte assistant.
5. Exécuter une fois l’action décidée, puis vérifier reçu et état autoritaire.
   Après réponse perdue ou parsing local échoué, relire le même reçu ; une
   erreur du lecteur ne prouve pas l’échec serveur.
6. Une fois le périmètre soldé, poursuivre le premier travail non prouvé.
   Éviter un audit complet répété et la réinitialisation d’un RUN/SID/modèle.

## Quand remonter au correcteur

Transmettre un défaut reproduit ou une voie qualifiée qui échoue avec preuves
complètes : versions, identités, source/date, code exact, champ manquant/diff,
état des reçus et effet connu/inconnu. Ne pas transmettre tokens ou payloads
sensibles. Une offre de plan reste un instantané, jamais une permission.
Un signalement n’autorise pas le correcteur à agir sur le RUN métier.
Le correctif produit/documentaire suit SCM, version, commit, publication et
CABU ; sa livraison et la reprise effective restent des preuves distinctes.

Ancienne génération/SID rejeté, suffixe de mandats et preuve d’instance après reboot : [voies historiques](historical-owner-boundaries.md).

### Révision enfant : carte et projection

GET /runs/<runId>/locks.revisions est une projection sur les ressources du RUN.
Une valeur agrégée du parent inclut ses autres enfants et ne permet pas de
reconstituer la révision exacte de chaque descendant. Pour préparer un mandat
plus fin, utiliser localement la carte publique GET /runs → coordination.revisions,
filtrer les seules clés utiles et prendre max(overlaps) avec l’export du plugin
actif. Ne pas transmettre le reste de ce snapshot à l’agent. Une erreur
resource-revision-stale reste légitime si une révision enfant diffère ; refaire
une demande d’IDs et digests neufs après relecture, sans changer la garde.

## Opération prétendument disparue : comparer les identifiants exacts

Avant toute réparation, rapprocher byte pour byte requestId/approval_id/
operation_id de la demande native persistée, de la décision et de l’URL lue.
Ne pas reconstruire un identifiant depuis le titre, le nom du helper ou un
suffixe descriptif ; un mot ajouté suffit à filtrer une opération inexistante.
Afficher localement représentation et longueur des chaînes, puis lookup exact
dans GET /runs coordination.operations sur la même origine et le même PID
controller. Une liste tronquée n’est pas preuve d’absence. Si l’entrée exacte
est PREPARED/approved, reprendre l’acquisition déjà autorisée après contrôles
d’identité/révisions ; ne pas recréer, redécider ou réconcilier une fausse cible.

## Jetons des accès — CAB 2.3.8

Les consultations publiques du contrôleur (`/runs`, statut RUN, `/locks`, coordination globale) omettent les jetons des accès de travail, comme ceux des baux de test. Elles servent au diagnostic et ne récupèrent aucune capacité. Le propriétaire conserve le jeton reçu par POST d’acquisition ou de réconciliation uniquement dans son processus local autorisé ; ne jamais l’afficher dans un transcript, un rapport ou un journal. Sa valeur, son fencing et les gardes restent inchangés par ces lectures. Un retour POST perdu se traite par la récupération qualifiée applicable, jamais par l’invention d’un jeton ni le rejeu d’un effet incertain. Le masquage n’autorise aucune libération sans preuve.

Un cleanup de change multi-RUN refusé `erasure-run-not-closed-or-foreign` exige de qualifier les attributions historiques, pas de supprimer ou renommer un RUN. La [revue multi-propriétaire](change-erasure.md)2.3.9 utilise preview puis ownershipReview exacte ; elle ne remplace ni le gate ni la réconciliation des effets.

Un erasure-operation-unreconciled peut signaler l’ancien format COMPLETED sans nativeResult : vérifier le [reçu terminal historique](change-erasure.md), sans compléter manuellement le registre. Les empreintes et l’accès libéré sont obligatoires ; ne jamais assimiler un effet en cours/inconnu à ce format.

Différentiel de préservation ou impasse après intégrité réparée : [réparation bornée](preservation-repair.md). Les protections locales restent inchangées ; aucune ancienne once n’est rejouée.
