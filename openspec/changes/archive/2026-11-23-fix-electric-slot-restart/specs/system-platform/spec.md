## ADDED Requirements

### Requirement: Reprise du slot de réplication Electric pendant les mises à jour Debian

CAB SHALL configurer les messages PostgreSQL en locale C pour le seul rôle Electric dans la base CAB lors de l’amorçage et avant le redémarrage après mise à niveau Debian. CAB SHALL examiner le slot Electric existant avant le redémarrage et préserver le stockage des abonnements sans suppression automatique pour résoudre une collision.

#### Scenario: Slot persistant valide avant redémarrage
- **WHEN** une mise à niveau Debian redémarre Electric avec son slot persistant valide dans une base PostgreSQL localisée
- **THEN** Electric reprend le slot et l’abonnement reçoit les changements conservés pendant l’arrêt
- **AND** CAB redevient READY et la configuration Debian se termine

#### Scenario: Slot absent
- **WHEN** le slot Electric est absent au redémarrage après la mise à niveau
- **THEN** Electric crée le slot et resynchronise les abonnements dont la position n’est plus valide
- **AND** CAB redevient READY et la configuration Debian se termine

#### Scenario: Slot incompatible ou invalidé
- **WHEN** le slot de même nom est incompatible avec Electric ou invalidé
- **THEN** CAB bloque la finalisation avec un diagnostic et préserve le slot et le stockage pour examen
