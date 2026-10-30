## ADDED Requirements

### Requirement: Lanceur fournisseur installé utilisable par lien
Le helper provider-connect MUST exécuter main lorsqu’il est lancé directement ou via son lien installé, et MUST rester sans effet à l’import en bibliothèque. Un exit0 sans reçu MUST NOT être considéré comme preuve de raccord. Les tests MUST vérifier le lien symbolique avec canal secret privé et effet unique.

#### Scenario: Lien installé
- **WHEN** Node lance le helper par un lien vers la release gérée
- **THEN** la CLI produit son reçu et effectue au plus le raccord autorisé, sans exposer la clé

### Requirement: Distribution de la qualification de continuité2.1.20
Les briques et commandes MUST annoncer2.1.20, distribuer le lanceur corrigé et documenter la différence entre sonde fraîche et continuité historique. La qualification MUST utiliser2.2.0 exact et des métadonnées synthétiques. SCM réussi MUST être suivi de CABU puis notification de l’activation ; une limite native démontrée MUST rester explicite et ne pas être présentée comme correction de l’histoire réelle.

#### Scenario: Livraison avec limite native prouvée
- **WHEN** le correctif CLI et la qualification sont validés
- **THEN** la livraison indique séparément les comportements corrigés, les limites démontrées et les opérations réellement activées
