# Proposition

## Pourquoi

Une validation CAB demeure actuellement PENDING lorsqu'aucune décision n'est
reçue, sans mécanisme qui rappelle cette attente à l'orchestrateur. Une relance
corrélée toutes les trente secondes rend l'attente visible sans transformer son
absence de réponse en décision.

## Changements

- Le broker relance le contrôleur local toutes les trente secondes pour une
  validation PENDING notifiée et toujours dépourvue de décision.
- Le contrôleur transmet la relance à sa tâche orchestratrice persistante,
  planifie un heartbeat de reprise et conserve une notification locale lorsque
  ce réveil n'est pas disponible.
- Les relances restent corrélées au mandat et ne modifient jamais son état ni
  ne transmettent une permission OpenCode.

## Capacités

### Nouvelles capacités

Aucune.

### Capacités modifiées

- `approval-workflow` : définir la relance périodique corrélée d'un mandat
  PENDING sans décision.
- `controller-transport` : définir l'endpoint local de relance et les actions
  ordonnées du contrôleur vers l'orchestrateur.
- `supervision-remediation` : rendre observable l'échec de réveil sans en
  faire une remédiation décisionnelle.

## Impact

Le broker Python, le contrôleur Node.js, leurs tests et la documentation CAB
sont concernés. Aucun transport MCP réseau, fournisseur externe, permission
OpenCode ou décision automatique n'est ajouté.
