# Cycle du RUN — CAB 1.10.4

Le catalogue partagé est distribué dans `cgpt-approval-bridge-run-steps.mjs`.
L'étape représente le cycle du change. La phase technique WORK/REPORT reste
distincte. ETAT décrit la situation observée, notamment WAITING pendant une
attente de décision ou de ressource. Les tâches X/Y proviennent de tasks.md.

| Position | stepId | Nom |
| --- | --- | --- |
| 1/11 | INITIALIZATION | Initialisation |
| 2/11 | PREFLIGHT | Prévol |
| 3/11 | ANALYSIS | Analyse |
| 4/11 | SCOPING | Cadrage |
| 5/11 | SPECIFICATION | Spécification |
| 6/11 | IMPLEMENTATION | Implémentation |
| 7/11 | VERIFICATION | Vérifications |
| 8/11 | REVIEW | Revue |
| 9/11 | ARCHIVING | Archivage |
| 10/11 | STATISTICS | Statistiques |
| 11/11 | CLOSURE | Clôture |

Après armement, l'orchestrateur déclare l'étape réellement examinée par
`POST /runs/<run_id>/job/progress`. Il lit d'abord `GET /runs/<run_id>/job` :
`lifecycle.sequence` donne la séquence attendue, ou zéro si lifecycle est null.

```json
{
  "jobId": "<job courant>",
  "stepId": "IMPLEMENTATION",
  "stepStatus": "IN_PROGRESS",
  "expectedStepSequence": 2
}
```

La séquence 2 n'est qu'un exemple ; utiliser celle réellement observée. La
route historique `/job/progress` accepte le même contrat. Déclarer chaque
changement effectif de l'étape. Un retour de Vérifications 7/11 ou Revue 8/11
vers Implémentation 6/11 est autorisé, puis les contrôles sont repris. La
position ne prouve pas l'achèvement de toutes les étapes précédentes.

stepStatus accepte IN_PROGRESS par défaut, ALREADY_COVERED pour une étape déjà
couverte par des preuves examinées, ou NOT_APPLICABLE lorsque le cycle ne
l'exige pas. Ne pas renuméroter les étapes et ne pas inventer des passages
pour remplir les étapes antérieures. Le démarrage de la collecte après
Initialisation ou Prévol n'autorise pas à reconstruire leur historique.

Le contrôleur attribue dates et séquences, conserve les cent derniers passages
et expose l'étape courante par la dernière entrée. Une répétition identique
du dernier appel est idempotente. Une séquence périmée donne un refus ; relire
le job avant tout nouvel examen, sans écraser une déclaration concurrente.
Une écriture d'étape en cours peut produire HTTP 409
`lifecycle-transition-in-flight`. La réponse réussie est HTTP 202.

Les champs historiques lastProvenMilestone et currentCabMandate gardent leur
contrat. Une mise à jour sans les champs d'étape ne déclare aucun passage.
Un job ancien sans lifecycle garde une étape non renseignée. Réarmement du
même job et récupération du même RUN conservent l'historique. Un nouveau job
commence sans déclaration d'étape.

Étape et historique sont des métadonnées d'observation, sans mandat,
permission, décision, acquisition, relance ou preuve terminale. CLOSURE
11/11 ne valide pas le gate. Après validation du gate, toute nouvelle
déclaration est refusée ; clôture, désarmement et libération restent régis
par les contrats CAB existants. Ne pas démarrer de nouveau RUN pour modifier
l'affichage et ne pas muter un RUN actif sans autorisation de pilotage.
