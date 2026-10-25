## ADDED Requirements

### Requirement: Identification du broker enfant de tout thread OpenCode
La découverte du broker MUST examiner les enfants de tous les threads du processus OpenCode déclaré et dédupliquer leurs PID. Elle MUST conserver les contrôles d'UID, PPID, forme de lancement, point d'entrée, identité stable et unicité. Elle MUST recontrôler l'identité OpenCode après découverte. La disparition concurrente d'un thread MAY être ignorée ; toute autre erreur MUST rester bloquante. La découverte MUST NOT exposer d'environnement ou d'argv brut.

#### Scenario: Broker créé depuis un thread secondaire
- **WHEN** le broker unique déclaré est lancé par un thread secondaire du même OpenCode
- **THEN** sa preuve est reconnue avec les mêmes contrôles stricts et le processus OpenCode est conservé

#### Scenario: Enfant absent ou multiple
- **WHEN** aucun candidat ou plusieurs candidats satisfont les contrôles
- **THEN** la vérification est refusée et la maintenance reste gelée

#### Scenario: Parent ou lancement divergent
- **WHEN** l'UID, le PPID, la commande, le point d'entrée ou l'identité OpenCode diffère de la preuve
- **THEN** aucun candidat divergent n'est reconnu et aucune permission n'est accordée
