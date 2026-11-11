# CAB3.0.0 — plateforme système

## Why
Le développeur a validé le cahier des charges et les choix techniques : un
service système root, PostgreSQL indépendant, Django/OpenAPI, TanStack, paquet
Debian DIU et intégrations agents minimales. Le dernier mandat impose Electric
pour la visibilité temps réel des sessions actives et réduit les campagnes
de tests aux preuves essentielles sans supprimer les gardes de protocole.

## What Changes
- Servicecab.service et installation Debian reproductible, amorçage Web8790.
- Autorité métier Django, transactions PostgreSQL, profils direct/piloté autonomes.
- ContratOpenAPI versionné, connecteursMCP/CLI communs et intégrationCodex légère.
- InterfaceTanStack et synchronisationElectric bornée aux données de suivi autorisées.
- Reprise/import contrôlés des identités, reçus et protections historiques.
- Mise à jour à frontière sûre, retour sur le même reçu, nettoyages ciblés.

## Impact
Évolution majeure3.0.0. Adaptation DIU distincte pour scripts de maintenance
embarqués, puis CI/CD etCABU explicitement autorisés. Pyproject préexistant
inclus. Les autres sessions et changements conservés ; aucune création ou
réémission d’effet déduite d’un import ou d’une absence de reçu.
Code de lot non attribué, aucune normalisationACL globale.
