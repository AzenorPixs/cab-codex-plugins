## MODIFIED Requirements

### Requirement: Référence locale du protocole de codage piloté

Le skill CAB et ses références MUST porter le contrat commun. AGENTS.md MUST
le résoudre sans copie locale intégrale ORCHESTRATED_CODING.md. La commande
MUST router vers les procédures utiles, chargées à la demande. La migration
MUST vérifier la destination des obligations avant retrait du fichier local.
Une session SCM directe MUST NOT déclencher de pilotage, OpenCode ou de
télémétrie réservée aux sessions pilotées.

#### Scenario: Session pilotée
- **WHEN** les deux agents préparent une session CAB
- **THEN** ils chargent le noyau distribué commun et les branches nécessaires sans exiger le fichier local supprimé

#### Scenario: Session directe
- **WHEN** SCM est exécuté directement
- **THEN** aucune présence du plugin ou du protocole ne déclenche de pilotage implicite

#### Scenario: Projet sans besoin de pilotage
- **WHEN** le projet ne nécessite aucune session orchestrée
- **THEN** l’absence du protocole local est normale et ne bloque pas le travail direct

### Requirement: Point de coordination des incidents de codage CAB

Le contrat distribué MUST privilégier le diagnostic local et les récupérations
qualifiées déjà autorisées. Un incident réparable MUST NOT imposer un nouveau
chat de correction. Un envoi ou une création de chat MUST nécessiter la demande
explicite correspondante et respecter une clôture ou révocation existante.
Les faits, limites, mandats et preuves MUST rester corrélés sans secret.

#### Scenario: Chat existant
- **WHEN** une coordination est explicitement demandée et son chat est identifié
- **THEN** l'orchestrateur le réutilise sans doublon, sous réserve d'une clôture ou révocation applicable

#### Scenario: Chat absent
- **WHEN** la recherche complète accessible ne trouve pas la cible et sa création n'est pas explicitement demandée
- **THEN** l'incident reste au checkpoint du RUN sans nouveau chat ni attente d'un correctif pour une récupération déjà autorisée

#### Scenario: Chat courant ou cible ambiguë
- **WHEN** le chat courant est la cible ou plusieurs résultats restent ambigus
- **THEN** consigner localement dans le premier cas et signaler l'ambiguïté dans le second, sans auto-message ou diffusion multiple ; un outil absent reste déclaré

### Requirement: Suivi d’incident jusqu’à activation vérifiée

Lorsqu'un correctif est nécessaire, son suivi MUST distinguer source qualifiée,
publication et activation vérifiée. Une récupération locale réussie MAY clore
l'incident sans nouvelle livraison. Les informations inter-chats MUST respecter
l'autorisation de communication applicable. Un échec MUST conserver preuves et
prochaine action sans rejouer une décision ou once ; les travaux disjoints
autorisés MAY continuer.

#### Scenario: Source publiée mais activation en attente
- **WHEN** le correctif est publié sans preuve CABU terminale
- **THEN** la version n'est pas déclarée effective et les preuves de reprise restent conservées

#### Scenario: Activation confirmée
- **WHEN** CABU confirme versions et readiness
- **THEN** l'incident peut être clos ; les sessions sont informées dans le seul périmètre de communication autorisé

#### Scenario: Échec de mise à jour
- **WHEN** CABU échoue ou une dépendance empêche la suite
- **THEN** l'incident conserve état, preuves et conditions de reprise sans rejeu ni gel des ressources indépendantes

## ADDED Requirements

### Requirement: Distribution cohérente CAB 2.2.0

Le paquet, broker, modules, unités, plugins et commandes MUST porter la version
2.2.0 commune. Les nouveaux modules de continuité, récupération, exécution et
efficacité MUST appartenir aux fermetures effectivement déployées. Les outils
de consultation et les nouvelles politiques MUST préserver les contrats
unitaires de décision, permissions et preuves.

#### Scenario: Import absent d’un groupe déployé
- **WHEN** un module importé n’est pas inclus dans le groupe cible
- **THEN** la préparation échoue avant coupure sans modifier les services
