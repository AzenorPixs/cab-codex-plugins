## ADDED Requirements

### Requirement: Mandat correctif porté par l'invocation CCAB
L'invocation explicite du plugin, du skill ou de la commande CCAB SHALL constituer le mandat développeur des correctifs CAB nécessaires au traitement des incidents sous SCM avec CICD. Ce mandat SHALL couvrir OpenSpec, réalisation, tests, documentation, distribution, livraison et activation nécessaires sans nouvelle confirmation générique pour chaque correctif, fichier ou étape. Les permissions techniques, restrictions explicites et mandats des projets consommateurs SHALL rester applicables.

#### Scenario: Nouveau correctif CAB nécessaire pendant le traitement
- **WHEN** CCAB identifie une correction CAB nécessaire à un incident pris en charge
- **THEN** il peut spécifier, réaliser, qualifier et livrer cette correction par SCM/CICD dans le mandat de l'invocation, sans redemander ce mandat au développeur

#### Scenario: Fichier du projet déclarant
- **WHEN** la réparation exige de prendre en charge un fichier préexistant du projet déclarant
- **THEN** CCAB conserve l'autorisation applicable à ce fichier et le mandat de ce projet ; son invocation ne fabrique ni propriété, ni permission, ni preuve

#### Scenario: Résolution et nettoyage
- **WHEN** la correction est qualifiée, livrée et activée
- **THEN** le retour vérifié du déclarant reste requis et aucune purge globale n'est autorisée par la seule invocation corrective
