## ADDED Requirements

### Requirement: Clôture d’un RUN avec un change OpenSpec

Un RUN de codage MUST NOT passer à CLOSED tant que son change OpenSpec est actif ou que son archive ne prouve pas la résolution de toutes ses tâches. Les preuves de livraison MUST NOT remplacer l’archive. Une clôture historique incohérente MUST garder son reçu et signaler l’écart.

#### Scenario: Livraison terminée et change actif
- **WHEN** les vérifications et la livraison ont réussi mais le change OpenSpec existe encore
- **THEN** CAB conserve le RUN ouvert et signale l’archive attendue

#### Scenario: Dépendance non satisfaisante
- **WHEN** le responsable arrête le RUN et identifie ses dépendances non satisfaites
- **THEN** CAB produit BLOCKERS.md pour le change actif et enregistre BLOCKED avec le chemin et l’empreinte du rapport
