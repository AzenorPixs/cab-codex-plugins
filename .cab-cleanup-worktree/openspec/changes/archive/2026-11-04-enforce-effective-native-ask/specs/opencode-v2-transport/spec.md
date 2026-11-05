## ADDED Requirements

### Requirement: ASK effectif et grants natifs sauvegardés
Le client SHALL distinguer règles ASK déclarées et grants sauvegardés du projet. Avant prompt de codage, décision positive ou once, il SHALL vérifier les deux et refuser si un grant couvre une action protégée, si le projet diverge ou si l’audit est indisponible. Les ressources des grants SHALL rester locales et ne pas être exposées dans le diagnostic. always SHALL être refusé par le client CAB. Un audit ne SHALL modifier aucune règle ni session.

#### Scenario: Grant node persistant malgré ASK nominal
- **GIVEN** shell ask déclaré et un grant shell sauvegardé du même projet
- **WHEN** un mandat natif permissionné est préparé ou une once est envisagée
- **THEN** l’audit déclare nominalReady mais ready false et bloque avant émission
- **AND** le contenu du grant n’est pas exposé au LLM

#### Scenario: Audit manquant ou projet divergent
- **WHEN** le service saved échoue ou le SID/répertoire/projet ne peut être lié
- **THEN** le contrôle reste fermé sans prompt, décision positive ou once

### Requirement: Révocation native sous maintenance partagée
Une autorité de maintenance partagée explicite SHALL pouvoir préparer puis appliquer un plan borné aux grants protégés du projet exact. PID/version, politique déclarée, empreintes des entrées, frontière inactive sans permission et autorité liée au plan SHALL être vérifiés. L’intention SHALL être persistée avant DELETE. Autres actions/projets, sessions, RUN et baux SHALL rester inchangés. La fin SHALL exiger l’absence des grants ciblés et un audit ASK prêt, sans rollback vers always.

#### Scenario: Révocation ciblée et conservation
- **GIVEN** un plan exact, une autorité partagée applicable et une frontière native inactive
- **WHEN** les grants protégés sont révoqués via leur API officielle
- **THEN** read/external et autres projets restent intacts, ASK est réaudité et le reçu privé devient terminal

#### Scenario: Autorité ou frontière non qualifiée
- **WHEN** l’autorité manque, un processus/projet/politique change, une session est active, une permission pend ou une entrée hors plan apparaît
- **THEN** aucune nouvelle suppression n’est envoyée et les preuves acquises restent conservées

#### Scenario: Réponse perdue ou reprise
- **WHEN** DELETE perd sa réponse mais l’entrée est absente dans une observation autoritaire
- **THEN** le reçu distingue absence observée et ACK, sans rejouer une commande native
- **AND** une reprise du même plan reste idempotente et bornée sur les mêmes IDs immuables
