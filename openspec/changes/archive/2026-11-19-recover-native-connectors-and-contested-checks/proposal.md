# Rétablir le rattachement MCP et contester un contrôle non probant

## Pourquoi

Des connexions natives vivantes obtiennent `bound=true` sans liaison Git effective. Un contrôle terminé avec zéro test peut aussi être sélectionné comme réussite et interdire sa propre correction.

## Changements

- Distinguer explicitement la liaison du journal natif et celle du connecteur réel.
- Diagnostiquer puis corriger la reconnaissance des connexions réelles, sans substitution de processus, identité ou rejeu.
- Ajouter une contestation administrative ciblée et atomique : preuve et reçu originaux conservés, ancienne preuve exclue, argv révisé et nouvelle exécution obligatoire.
- Distribuer le parcours dans le contrat CAB et conserver les évolutions DCAB validées dans la livraison regroupée autorisée.

## Impacts

API, relais MCP, sélection des preuves, documentation et tests ciblés. Aucune suppression de reçu, aucun changement des critères, producteurs ou autorités de revue. Aucune migration implicite d'un RUN ancien.
