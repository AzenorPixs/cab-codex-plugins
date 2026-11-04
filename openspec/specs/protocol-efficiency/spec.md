# protocol-efficiency Specification

## Purpose

Réduire le contexte et les échanges de pilotage inutiles grâce aux contrats conditionnels et aux attentes événementielles, et présenter les mesures natives avec leur couverture sans inventer de gains de facturation.

## Requirements

### Requirement: Contrat distribué unique et chargement conditionnel

Le skill CAB MUST exposer un noyau commun court et les références normatives
nécessaires à chaque branche. La commande CAB MUST router sans recopier le
contrat complet. La migration MUST vérifier la destination de chaque obligation
avant de supprimer ORCHESTRATED_CODING.md local. La règle AGENTS MUST être
modifiée dans le template, puis propagée seulement aux cibles autorisées.

#### Scenario: Consultation de statut
- **WHEN** une consultation status est demandée
- **THEN** elle charge la procédure ciblée sans les procédures de mise à jour, de benchmark ou de récupération non concernées

### Requirement: Échanges différentiels et contexte stable

Les nouveaux mandats et rapports SHOULD référencer le checkpoint et les preuves
existantes, puis transmettre les seuls changements utiles. Le préfixe statique
SHOULD rester stable et distinct des identités et résultats variables. Les
permissions, périmètres et critères MUST rester explicites et vérifiables.

#### Scenario: Rapport suivant un mandat
- **WHEN** le périmètre et l’objectif sont inchangés
- **THEN** le rapport fournit les nouveaux résultats, preuves et prochaine action sans recopier tout l’historique

### Requirement: Mesures natives et gains démontrés

Les mesures INPUT, OUTPUT, cache et coût MUST provenir de télémétrie native
attribuable. Absence MUST rester inconnue et zéro MUST rester zéro. Les
comparaisons MUST préciser scénario, fournisseur, modèle, couverture et
conditions ; une réduction de taille documentaire MUST NOT être présentée
comme une économie de tokens facturés non mesurée.

#### Scenario: Cache non exposé
- **WHEN** le fournisseur ne publie aucune mesure de cache
- **THEN** CAB expose cette indisponibilité sans inventer de taux ni de gain

### Requirement: Attente technique réveillée par la décision

Les attentes de décision MAY utiliser une attente HTTP bornée, réveillée par
la décision durable du même requestId. Le nombre d’attentes et leur durée
MUST être bornés ; déconnexion, fermeture ou préparation de bascule MUST les
libérer sans créer de décision. Les consultations ordinaires MUST rester
immédiates et l’ancien polling MUST rester un repli compatible.

#### Scenario: Décision pendant l’attente
- **WHEN** une décision corrélée est engagée durablement pendant une attente technique
- **THEN** la réponse est réveillée sans attendre l’intervalle de polling nominal

### Requirement: Décision documentaire par état de pilotage
Le contrat distribué SHALL relier état observé, preuve requise, action propriétaire et référence canonique. Il SHALL distinguer décision, acquisition, émission native et fin métier, ainsi que projection et registre complet. Un cas inconnu SHALL préserver les protections et autoriser seulement les diagnostics et travaux indépendants déjà mandatés, sans autorisation inventée.

#### Scenario: APPROVED sans accès partagé
- **GIVEN** une décision approuvée, une permission corrélée et aucune exclusivité prouvée
- **WHEN** l’orchestrateur poursuit le mandat
- **THEN** il demande locks/acquire au contrôleur et exige HELD avant que le contrôleur puisse répondre once
- **AND** aucune nouvelle demande ou édition n’est créée pour cette seule acquisition

#### Scenario: Wrapper dynamique encore actif
- **GIVEN** des identifiants ou empreintes calculés dans un wrapper opaque sans métadonnées complètes
- **WHEN** l’admission n’est pas prouvée
- **THEN** les mêmes identifiants sont conservés et aucune décision n’est déduite d’un timeout
- **AND** les futurs mandats emploient des valeurs préparées avant une soumission littérale qualifiée

#### Scenario: Reprise qualifiée et lecture périmée
- **GIVEN** une procédure existante exigeant une lecture native fraîche
- **WHEN** cette lecture expire avant soumission de l’action
- **THEN** seule l’observation du même objet peut être renouvelée après préparation du cadrage, sans réémission métier ni changement d’un reçu existant

#### Scenario: Transition après observation STABLE
- **GIVEN** un refus explicite run-transition-in-flight pendant décision ou acquisition
- **WHEN** l’orchestrateur observe la fin de transition et recontrôle les préconditions
- **THEN** il poursuit la même demande indécise ou la même acquisition encore nécessaire sur les mêmes identités, sans sollicitation humaine dans son mandat
- **AND** une décision déjà enregistrée ou un accès HELD ne sont pas réémis
- **AND** une réponse perdue exige une relecture autoritaire et n’autorise aucun rejeu de once ou d’effet métier

#### Scenario: Reçu approuvé pour une autre unité
- **GIVEN** un reçu APPROVED et une opération courante encore indécise dans le même RUN et SID
- **WHEN** les requestId ou approval_id ou operation_id ne correspondent pas
- **THEN** l’orchestrateur lit les preuves de la vraie demande courante sans lui attribuer l’approbation précédente
- **AND** aucune décision, commande ou once n’est reconstruite ou rejouée depuis cet ancien reçu

#### Scenario: État non répertorié
- **GIVEN** une combinaison non documentée ou des preuves contradictoires
- **WHEN** l’orchestrateur diagnostique le cas
- **THEN** il conserve les effets incertains et traite les unités indépendantes autorisées
- **AND** il distingue défaut technique à qualifier et décision métier hors périmètre réservée au développeur
