## Purpose

Réduire le contexte et les échanges de pilotage inutiles grâce aux contrats conditionnels et aux attentes événementielles, et présenter les mesures natives avec leur couverture sans inventer de gains de facturation.

## ADDED Requirements

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
