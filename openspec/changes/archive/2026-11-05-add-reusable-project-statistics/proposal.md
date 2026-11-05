# Statistiques réutilisables de projet et de change

Code non attribué ; attribution ultérieure par ACL.

## Why

Les exécutions SGS se sont arrêtées après inventaire, sans extraction ni
publication. Le format des contributions et la rédaction manuelle des rapports
de change empêchent une reprise reproductible.

## What Changes

- Distribuer dans CAB un moteur Python sans dépendance, un skill `sgs` et `/SGS`.
- Définir contributions, preuves, valeurs indisponibles et index de delta.
- Exposer une CLI/JSON agnostique des agents et orchestrateurs, en session directe ou pilotée, avec QUERY sans mutation.
- Produire/amender les six sections des rapports de changes archivés ou arrêtés
  pour dépendance, depuis des preuves structurées, en conservant l'historique.
- Régénérer systématiquement le global lors d'une invocation manuelle SGS.
- En session de codage, appliquer exclusivement un delta si le global existe ;
  sinon ne rien créer. Aucune reconstruction automatique dans ce mode.
- Accepter un export CAB attribuable, sans accès aux secrets ni collecte implicite.
- Adapter SGS dans le référentiel prompts, sans duplication du moteur.
- Afficher la brique Statistiques dans le Web Monitor avec version et disponibilité,
  sans service permanent ni action de contrôle.
- Réconcilier les écarts préexistants autorisés : garde HMAC, racines fichiers,
  fixtures V2 et identité du moniteur ; préserver les preuves historiques.

## Capabilities

### New Capabilities
- `global-project-statistics`: rapports et agrégats reproductibles et auditables.

## Impact

Plugin CAB, commandes, moteur et tests, documentation de distribution, prompt
commun SGS et points d'appel statistiques des sessions de codage. Qualification
sur le corpus CAB actuel. Aucun démarrage de service, pilotage ou CABU implicite.
