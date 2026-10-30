# Diagnostics HTTP des décisions — CAB2.1.30

## Réponse et sens

POST /decision/<requestId> ou /runs/<runId>/decision/<requestId> conserve le
statut400 pour les refus qui rendaient auparavant un corps vide. Il retourne
application/json et {error,message,decision_recorded}. error est un code fermé,
message une explication française fixe. Aucun corps de requête, commande,
chemin, ressource, révision brute, jeton ou exception n’est recopié.

Exemple :

```json
{"error":"resource-revision-stale","message":"La révision d’une ressource a changé depuis la demande.","decision_recorded":false}
```

decision_recorded reflète uniquement la table locale du contexte au moment de
la réponse. true signifie qu’il faut relire GETdecision et réconcilier : ce
n’est ni une preuve de décision native appliquée, ni de persistance après
redémarrage. false ne remplace pas l’examen des effets et permissions natifs.
Une erreur après enregistrement peut donc rendre400 avec ce champ true.
Les409 des gardes natives/de routage et le201 de succès restent inchangés.

## Codes

| Code | Motif |
| --- | --- |
| decision-invalid | La décision doit être approved, rejected ou needs_clarification. |
| decision-invalid-json | Le corps de décision n’est pas un JSON valide. |
| decision-validation-unknown | Aucune validation admise ne correspond à cette demande. |
| decision-already-recorded | Une décision est déjà enregistrée pour cette demande. |
| notification-reconciliation-rejection-only | Cette demande réconciliée accepte uniquement un rejet. |
| decision-operation-invalidated | L’opération de cette demande a été invalidée. |
| decision-context-closed | Le contexte de décision est fermé. |
| decision-recovery-transition | Une transition de récupération est en cours. |
| decision-session-revoked | La session du mandat est révoquée. |
| decision-context-divergent | Le mandat ne correspond pas au contexte du job. |
| decision-recovery-mismatch | Le mandat ne correspond pas au prévol de récupération courant. |
| decision-session-mismatch | La session du mandat ne correspond pas à celle du job. |
| decision-operation-not-admitted | L’opération n’est plus admise pour cette décision. |
| resource-revision-stale | La révision d’une ressource a changé depuis la demande. |
| reservation-version-stale | La version de réservation de la demande est périmée. |
| operation-identity-divergent | L’identité de l’opération ne correspond pas au registre. |
| operation-outside-reservation | Une ressource du mandat est hors de la réservation. |
| expected-revisions-invalid | Les révisions attendues du mandat sont invalides. |
| resources-invalid | Le manifeste de ressources du mandat est invalide. |
| resource-physical-alias-refused | Une ressource possède un alias physique non admis. |
| run-not-reserved | Le RUN ne possède plus de réservation active. |
| run-target-required | Un RUN doit être ciblé explicitement. |
| run-transition-in-flight | Une transition du RUN est en cours. |
| global-coordination-suspended | La coordination globale suspend l’admission de cette opération. |
| run-pause | Le RUN est en pause. |
| run-stop | Le RUN est arrêté. |
| maintenance-preflight-required | Un prévol de maintenance reste requis pour ce RUN. |
| coordination-upgrade-required | Le protocole de coordination requis n’est pas disponible. |
| registry-unavailable | L’autorité du registre n’est pas disponible. |
| broker-integrity-unavailable | L’intégrité du broker ne permet pas cette opération. |
| test-resource-not-held | La réservation de l’environnement de test n’est pas détenue. |
| test-reconciliation-required | La réservation de test restaurée doit être réconciliée. |
| decision-processing-failed | La décision n’a pas pu être traitée ; vérifier son état enregistré. |

## Conduite du pilote

Conserver le statut HTTP et le corps brut avant de tenter JSON.parse. Une
réponse rejetée n’est jamais une décision métier REJECTED. GETdecision404 et
undecidedValidationCount1 sont compatibles : une demande existe, sans décision
locale enregistrée. activeValidationCount mesure les traitements actifs et
ne remplace pas le compteur indécis.

Pour une révision périmée, examiner l’absence d’effet, clôturer l’ancienne
demande par une décision explicite de son orchestrateur ou l’annulation
supportée adaptée à son état, observer son résultat natif puis préparer une
identité neuve sur révisions relues. Ne pas inventer une révision0 ni réutiliser
une demande périmée pour exécuter. Une transition en cours ne justifie ni
maintenance ni suppression : observer sa fin et réconcilier la même demande.
Si decision_recorded=true, relire la décision existante et ses preuves avant
toute suite ; aucune réponse manquante n’autorise le rejeu d’une once.

Les causes inconnues restent volontairement génériques ; aucun message
arbitraire d’exception n’est utilisé pour compléter le diagnostic. Les usages
booléens de la garde conservent leur comportement. Le canal détaillé ne fait
que signaler la même cause, sans modifier autorité, décision ou permission.

## Vérification et activation

Tests isolés et HTTP réel : invalidité, validation inconnue, doublon,
révisions périmées à trois ressources, course de révision/reminder, exception
sensible, erreur après enregistrement et garde native409. Les preuves source
ne remplacent pas les versions actives vérifiées après CABU. Aucune décision
ou commande d’un RUN réel n’est envoyée pour démontrer un refus de test.
