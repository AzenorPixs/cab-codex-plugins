## Purpose

Définir les diagnostics et récupérations CAB limités au propriétaire, au RUN et aux ressources autorisés, avec preuves natives, décisions explicites et reçus durables, sans rejeu d’effet ni gel des travaux indépendants.

## ADDED Requirements

### Requirement: Aperçu de récupération typé et local au RUN

CAB MUST fournir un aperçu non autorisant des incidents du RUN, des ressources
affectées, des actions possibles et des preuves manquantes. Chaque état
non terminal MUST avoir une prochaine action explicite ou une décision
humaine précisément décrite. L’aperçu MUST rester utilisable quand la readiness
métier est dégradée et MUST NOT libérer une ressource par délai.

#### Scenario: Opération incertaine et travail disjoint
- **WHEN** une opération protège une ressource et un travail indépendant reste possible
- **THEN** l’aperçu conserve la protection, identifie sa portée et propose la progression compatible

### Requirement: Autonomie déléguée sans transfert d’autorité

La politique MUST lier actions, propriétaire, RUN et périmètre autorisés.
Les diagnostics sans effet MAY être automatiques. L’orchestrateur MAY choisir
une récupération comprise dans son mandat ; chaque mutation MUST vérifier les
gardes et produire un reçu idempotent. Une extension de périmètre ou destruction
non autorisée MUST demander une décision humaine.

#### Scenario: Reçu périmé ou propriétaire divergent
- **WHEN** une récupération utilise une ancienne frontière ou le RUN d’un autre propriétaire
- **THEN** CAB refuse la mutation et conserve les accès et décisions

### Requirement: Récupération sans décision ou effet implicite

Une politique de récupération MUST NOT approuver un mandat, rejouer once,
modifier le choix LLM, transférer un RUN ou effacer une preuve. Les actions
métier supplémentaires MUST avoir leur mandat et leurs permissions propres.

#### Scenario: Tentative de rejeu sous une politique de récupération
- **WHEN** une action tente de réutiliser une once consommée ou d’étendre une ancienne décision
- **THEN** CAB refuse l’effet et conserve la décision historique

### Requirement: Quarantaine et compensation explicites

Une quarantaine MUST conserver l’incertitude et la protection contre les effets
incompatibles ; elle MAY autoriser une continuation prouvée compatible. Une
compensation ou un environnement de remplacement MUST être une nouvelle
opération mandatée et traçable. L’opération historique MUST NOT être déclarée
terminée ou sans effet par cette seule continuation.

#### Scenario: Ressource jetable indisponible
- **WHEN** le mandat autorise une ressource de remplacement indépendante
- **THEN** l’orchestrateur peut préparer son nouveau mandat sans libérer ni réinterpréter l’effet historique

### Requirement: Corruption locale isolée du RUN

Un checkpoint privé invalide attribuable à un RUN MUST conserver ses effets
protégés et exposer une récupération nécessaire sans empêcher les RUN
indépendants de communiquer. Les méthodes de ce contexte MUST refuser toute
nouvelle permission tant que la cohérence n’est pas prouvée. Une corruption
du registre partagé MUST garder sa protection globale d’intégrité.

#### Scenario: Deux RUN et un checkpoint privé illisible
- **WHEN** un seul checkpoint de communication est invalide
- **THEN** ce RUN expose sa cause, son diagnostic reste accessible et le pair indépendant continue ses mandats autorisés

### Requirement: Récupération sans recopie des jetons

Une action déléguée MUST être liée à une politique, un propriétaire, une
génération et un digest de frontière courants. Le contrôleur MAY fournir aux
gardes internes les jetons de la seule ressource autorisée. Les aperçus et
reçus publics MUST NOT exposer ces jetons. Toute frontière périmée, action
hors politique ou cible étrangère MUST être refusée avant mutation.

#### Scenario: Action sur une attente de test propre au RUN
- **WHEN** la politique autorise l’annulation de cette attente et la frontière est inchangée
- **THEN** les gardes existantes sont appliquées avec les identités internes exactes et le reçu public ne contient aucun jeton

### Requirement: Reçu durable des actions de récupération

Une action MUST conserver un actionId immuable, une intention durable et son
résultat filtré avant acquittement HTTP. Une réponse perdue MUST permettre la
relecture du même reçu sans nouvelle mutation. Après crash entre l’effet de
coordination et son reçu, une preuve du registre MAY réconcilier le résultat ;
une issue non prouvée MUST rester explicitement indéterminée sans rejeu.

#### Scenario: Annulation effectuée et réponse perdue
- **WHEN** une attente est déjà annulée après l’intention de récupération
- **THEN** le résultat est observé sans attribuer une causalité non prouvée et sans annuler une seconde fois
