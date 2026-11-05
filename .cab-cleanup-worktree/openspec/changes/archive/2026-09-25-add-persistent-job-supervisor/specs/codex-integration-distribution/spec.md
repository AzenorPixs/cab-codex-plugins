# Spec Delta

## ADDED Requirements

### Requirement: Distribution du superviseur local

Le plugin CAB SHALL distribuer le superviseur persistant et son unité systemd
utilisateur avec le contrôleur. `/cab start` SHALL installer et démarrer
explicitement le superviseur après le contrôleur, sans l'activer au login.
`/cab stop` SHALL refuser l'arrêt normal tant qu'un job armé ne possède pas un
gate terminal validé, puis arrêter explicitement le superviseur avant le
contrôleur. Les artefacts distribués du broker, du contrôleur et du
superviseur SHALL annoncer la même version de base.

#### Scenario: Démarrage d'un superviseur distribué

- **WHEN** `/cab start` a confirmé les préconditions CAB et installé les
  ressources locales
- **THEN** il démarre le superviseur utilisateur, vérifie son état local et ne
  l'active pas pour le login
