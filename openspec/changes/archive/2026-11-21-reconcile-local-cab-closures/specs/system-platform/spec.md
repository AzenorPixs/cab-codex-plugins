## ADDED Requirements

### Requirement: Réconciliation d'un contrôle OpenSpec hôte arrêté

CAB MUST permettre à l’administrateur autorisé de réconcilier un contrôle OpenSpec hôte sans résultat après vérification de son reçu, de son autorisation et de l’arrêt de son groupe de processus.

#### Scenario: Arrêt prouvé et résultat absent

- **WHEN** l’administrateur présente le reçu exact et que le contrôle hôte est arrêté
- **THEN** CAB conserve le reçu et libère uniquement ses baux, sans reconstruire un résultat ni relancer le contrôle

#### Scenario: Producteur encore actif

- **WHEN** le processus ou son groupe est actif ou que les preuves divergent
- **THEN** CAB refuse la réconciliation

### Requirement: Retrait d'une livraison avant effet Git

CAB MUST permettre une clôture SCM locale lorsqu’un développeur retire son autorisation de publication avant tout effet Git de livraison. CAB MUST conserver les contrôles, les preuves et l’historique de la politique.

#### Scenario: Retrait d'un mandat de publication

- **WHEN** le développeur autorise la clôture locale d’un RUN direct dont l’index est libéré sans livraison engagée
- **THEN** CAB remplace le mandat de publication par un mandat local et vérifie les autres critères

#### Scenario: Clôture locale suspendue avant l'indexation

- **WHEN** la clôture d’un RUN direct a été suspendue faute d’accès au producteur de statistiques avant tout effet Git terminal
- **THEN** CAB peut revenir à la préparation de l’index et attend sa libération avant la clôture locale
