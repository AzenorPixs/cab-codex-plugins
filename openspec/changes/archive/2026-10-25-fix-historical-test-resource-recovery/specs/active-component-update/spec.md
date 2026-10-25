## ADDED Requirements

### Requirement: Réparation explicite du lecteur sous gel existant
Une réparation autorisée MUST conserver le même identifiant de maintenance, HELD et générations, vérifier PAUSE, quiescence native, OpenCode et broker déconnecté. Elle MUST préserver le journal et stages initiaux et ne réviser que le candidat de code explicitement qualifié. Le registre métier et les anciennes releases MUST NOT être réécrits. Une dérive MUST refuser avant application.

#### Scenario: Lecteur incompatible avec une clé historique
- **WHEN** le contrôleur cible échoue à restaurer une histoire valide et la correction du lecteur est qualifiée
- **THEN** un plan récupérable prépare une nouvelle release immuable sous le même journal, puis l'updater vérifie versions et identités avant toute libération

#### Scenario: Candidat ou autorité divergent
- **WHEN** le code contient une autre modification ou le HELD, le registre, les permissions ou le processus OpenCode divergent
- **THEN** aucune révision technique n'est appliquée et le gel reste conservé

#### Scenario: Reprise du plan interrompu
- **WHEN** la même réparation est réémise avec le même candidat et autorisation
- **THEN** les copies et étapes déjà prouvées sont réutilisées sans nouvelle maintenance ni restauration de données métier
