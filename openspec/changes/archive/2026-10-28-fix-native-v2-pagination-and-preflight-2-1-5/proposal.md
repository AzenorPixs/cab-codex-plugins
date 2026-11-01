# CT14 — Pagination et preuve native OpenCode — CAB 2.1.5

## Why
OpenCode 2.2 refuse cursor combiné à order. Les utilisateurs natifs ne portent pas toujours modèle/variante, alors que la réponse assistant les expose. Le prévol réel est achevé mais le contrat CAB ne peut pas encore le valider.

## What Changes
- Envoyer order uniquement sur la première page et suivre les curseurs bornés sans doublon.
- Reconnaître un échange natif unique complet : un utilisateur précédant une réponse assistant, modèle/variante observés sur celle-ci, dates et absence d’outil contrôlées. Ne jamais compléter le message utilisateur.
- Garder les preuves héritées et refuser les échanges ambigus, partiels ou contradictoires.
- Distribuer 2.1.5, qualifier, archiver, publier et activer puis exécuter CAB test dans son seul contexte dédié.

## Capabilities
### Modified Capabilities
- opencode-v2-transport: pagination native et provenance de la normalisation.
- coding-model-policy: preuve native unique sans modèle utilisateur.
- codex-integration-distribution: base 2.1.5.

## Impact
Client V2, vérificateur de prévol, tests, distribution, documentation et suivi provisoire sans code. Aucun RUN existant, catalogue, historique ou secret modifié. Aucune purge ni fermeture OpenCode. Les états avant/après sont comparés.
