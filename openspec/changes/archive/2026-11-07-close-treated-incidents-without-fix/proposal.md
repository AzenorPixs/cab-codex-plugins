## Why
Une entrée examinée sans correctif n'a pas toujours la nature d'un faux positif. Elle doit pouvoir être soldée sans masquer les limites qui subsistent.

## What Changes
- Admettre une résolution `no-fix` avec justification, limites et retour au déclarant.
- Conserver les résolutions et protections existantes ; ne pas prétendre que les données sont réparées.
- Permettre la purge globale atomique demandée par le développeur seulement si toutes les entrées sont traitées, indépendamment de l'état des RUN.
- Après réponse vérifiée et clôture, nettoyer chaque entrée traitée sans attendre les autres ; préserver les reçus partagés nécessaires aux autres entrées.

## Capabilities
### Modified Capabilities
- `corrective-incident-queue`: clôture des incidents traités sans correctif.

## Impact
Contrat CCAB, service, skill, commande et tests ; aucune levée de protection des RUN.
