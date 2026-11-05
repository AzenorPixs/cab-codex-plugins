# Diagnostic propriétaire autonome — CAB 2.2.39

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
