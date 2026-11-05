# Soumettre, décider et acquérir — CAB 2.2.33

Parcours propriétaire d’une unité déjà autorisée. Il complète
[les mandats](technical-mandates.md) et [les accès](concurrent-runs.md).
Pour une autre frontière, choisir [la grille](pilot-state-matrix.md), puis la
seule référence utile. Ne pas reconstruire le moteur ni charger toutes les
procédures de reprise pour une acquisition ordinaire.

## 1. Préparer avant de solliciter l’agent

L’orchestrateur examine le contenu exact et le manifeste. Il prépare les IDs
requestId/approval_id/operation_id/access_id applicables, operation_digest,
révisions et empreinte native avec les helpers déjà disponibles. Le calcul
local de données ne nécessite ni Bash natif OpenCode ni nouvelle permission
métier. Utiliser la convention du contrat, pas une empreinte inventée.
Le [garde input](native-input-guard.md) précise le calcul sur l’objet natif exact.
Ne jamais reprendre le tool_input_sha256 d’un edit pour un shell de validation,
ni celui d’une commande précédente pour une autre forme d’input. Les defaults
omis et les valeurs explicites peuvent produire des empreintes différentes.

Transmettre à l’agent les valeurs examinées et l’obligation d’un seul effet.
L’agent soumet exactement ce payload ; il ne le réécrit pas après la décision.
Ne pas mêler à ce transport la génération d’UUID, la lecture de fichiers,
crypto, le calcul d’empreintes ou une transformation du résultat. Une
préparation purement calculatoire éventuelle doit être séparée du wrapper
qui attend la décision ; préférer la préparation par l’orchestrateur.

## 2. Forme littérale pour l’admission anticipée

La forme canonique est le retour direct d’un appel MCP aux données littérales :

```javascript
return await tools["cgpt-validation"].request_validation({
  requestId: "REQUEST_ID_EXACT",
  approval_id: "APPROVAL_ID_EXACT",
  run_id: "RUN_ID_EXACT",
  reservation_version: 123,
  coordination_protocol: "resource-scoped-v1",
  operation_id: "OPERATION_ID_EXACT",
  operation_digest: "SHA256_OPERATION_EXACT",
  expected_revisions: {"file:notes.md": 456},
  resources: [{key: "file:notes.md", mode: "write"}],
  session_id: "ses_EXACT",
  directory: "/workspace/canonique",
  change_id: "change-exact",
  files: ["notes.md"],
  commands: [],
  title: "Titre examiné",
  summary: "Résumé examiné",
  tool_input_sha256: "SHA256_INPUT_NATIF_EXACT"
});
```

C’est un gabarit documentaire, pas une requête à envoyer. Remplacer toutes les
valeurs par celles du mandat courant et conserver ses champs optionnels exacts.
Une découverte search et son assertion de chemin ne sont admises que dans les
formes qualifiées de [technical-native](technical-native.md). Ne pas extrapoler
cette prise en charge à tout JavaScript.

Une fois la demande admise et ses données exactes visibles côté contrôleur,
l’orchestrateur examine et décide pendant que request_validation attend sa
réponse. Il ne doit pas attendre que le wrapper ou le SID devienne idle pour
cette décision ordinaire : cette attente peut dépendre précisément de sa
décision. La contrainte idle des récupérations ne s’applique pas par analogie
à une soumission ordinaire corrélée en cours. L’admission seule n’approuve rien.

Un wrapper qui calcule crypto.randomUUID(), approval_id, operation_id ou
operation_digest peut rester opaque pendant running : metadata.toolCalls
n’expose pas encore ses valeurs. Le contrôleur ne peut pas approuver un input
qu’il ne peut corréler. Après fin, une corrélation complète peut devenir
MATCHED ; aucune durée d’admission anticipée n’est garantie pour ce programme.

Si cette situation existe déjà, garder ses IDs, consulter admission et
corrélation datées et observer la même demande. Ne pas créer de requête de
remplacement pendant une émission incertaine. Un PENDING/FAILED ancien ne
prouve pas l’état actuel ; un NOT_ADMITTED reste terminal. L’amélioration du
wrapper concerne la prochaine unité neuve, pas la réécriture de l’ancienne.

## 3. Décision puis acquisition : deux opérations distinctes

Avant de conclure à une divergence broker/contrôleur, relier les preuves de
l’unité courante : requestId, approval_id, operation_id/operationDigest,
SID/RUN/version et empreinte native exacte. Lire le requestId enregistré pour
cette opération, puis la décision et l’admission de ce requestId. Un
poll_approval APPROVED pour l’édition précédente ne valide pas le shell suivant,
même dans le même RUN/SID. Si les IDs diffèrent, observer la vraie demande
courante sans reconstruire une décision depuis l’ancien reçu ni réémettre
le shell. Si toute la chaîne concorde et que la divergence persiste, appliquer
la voie de reprise qualifiée de la grille, sans extrapoler cette explication.

APPROVED enregistre la décision ; cela ne crée pas systématiquement HELD.
Un refus `run-transition-in-flight` pendant décision ou acquisition suit
[la reprise sur les mêmes identités](admission-state.md), sans sollicitation
humaine dans le mandat courant ; STABLE est un instantané, pas une réservation.
Un fichier est partagé par défaut. exclusiveResources vide, une réservation
ou l’absence d’autre accès observé ne prouvent pas une admission exclusive.

Pour un accès partagé, l’orchestrateur demande au contrôleur :

```text
POST /runs/<run>/locks/acquire
version           = génération courante examinée
operationId       = accessId de l’opération existante
operationDigest   = digest de cette même opération
resources         = ensemble exact approuvé
expectedRevisions = révisions approuvées, encore courantes
```

L’absence d’access_id explicite dans la demande donne par défaut son
operation_id. Vérifier le registre complet filtré localement si la projection
ne montre pas ce champ. Conserver les mêmes IDs et la même décision pour
cette seule acquisition ; ne pas soumettre une autre édition.

Le contrôleur effectue et persiste l’acquisition demandée. Dire qu’il est le
seul à acquérir/lier signifie qu’il applique les gardes et possède le registre,
pas qu’il devine et acquiert automatiquement tous les accès. Seule une
admission exclusive prouvée peut éviter cet appel séparé.

HELD permet le recontrôle suivant ; WAITING n’est pas une acquisition et STALE
ne permet pas d’échanger la révision sous une ancienne décision. Suivre leur
référence. Traiter token/fencing dans le client local privé, sans token dans
le modèle, les arguments, les journaux ou le checkpoint.

## 4. Permission native et fin

Si l’agent a déjà émis l’unique edit/shell et que sa permission exacte attend,
ne pas l’émettre une deuxième fois. Après HELD, le contrôleur seul vérifie
RUN/SID/call/permission/input, écrit INTENT, répond once et persiste ACK.
L’orchestrateur ne répond pas once via le client HTTP. Un compteur
unmatchedNativePermissionCount à zéro ne prouve ni absence de permission
native ni acquisition HELD ; vérifier les deux surfaces exactes.

Lire ensuite résultat natif, révision et contenu/résultat attendu. Une édition
peut être COMPLETED sans exit numérique ; un shell exige sa preuve de fin et
son exit selon le contrat. ACK seul n’est pas réussite métier. Après revue,
libérer l’accès avec la procédure et l’issue appropriées. COMPLETED avec accès
encore HELD n’est pas une panne SSE ; ce sont deux états distincts.

Si le contrôleur refuse malgré décision/accès/preuves exacts, relever son code
courant et la frontière ; ne pas contourner le garde ou fabriquer un ACK.

## 5. Reprise et fraîcheur sans boucle de relecture

Pour une récupération qualifiée, préparer d’abord la revue, les références
et la policy bornée. Réaliser ensuite la lecture native fraîche exigée, attendre
le SID idle, lire diagnostic et plan frais, puis soumettre l’action examinée.
Ces GET et la construction du payload peuvent être regroupés dans un client
local borné après revue, sans exposer les tokens ni modifier l’horloge.

Si l’observation expire avant toute soumission, renouveler seulement la
lecture du même objet ; cela ne rejoue pas l’action métier. Si l’action a déjà
été envoyée ou sa réponse est perdue, relire d’abord son reçu : ne pas modifier
un payload lié à un actionId immuable ou créer une nouvelle action pour cacher
une issue incertaine. Les gardes et fenêtres existantes restent inchangées.
