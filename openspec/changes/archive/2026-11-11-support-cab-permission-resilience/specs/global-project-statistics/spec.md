## MODIFIED Requirements

### Requirement: Modes de publication du projet
Le moteur MUST lire et préserver les modes des livrables existants compatibles.
L'option `--file-mode`, lorsqu'elle est fournie, MUST exiger 0770 pour les
rapports et leur registre. Les nouveaux verrous et journaux techniques MUST
être en 0770 ; les anciens modes compatibles restent utilisables.

#### Scenario: Convention CAB
- **WHEN** la publication demande explicitement le mode 0770
- **THEN** les rapports et le registre publiés utilisent 0770 et le retour arrière conserve les modes initiaux
