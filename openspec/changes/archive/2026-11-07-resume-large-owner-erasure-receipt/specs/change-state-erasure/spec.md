## ADDED Requirements

### Requirement: Reçu propriétaire volumineux reprenable
Le lecteur et l’écrivain du reçu d’effacement SHALL accepter la même borne maximale128Mio, sans relâcher signature, propriétaire, type, liens ou scope. Un dépassement SHALL être refusé avant publication du candidat. La reprise d’un reçu APPLYING SHALL reconnaître les fichiers déjà aux empreintes après sans les réécrire. APPLIED SHALL rester conditionné à l’absence vérifiée des références ciblées et à la préservation des pairs.

#### Scenario: Reçu supérieur à64Mio
- **WHEN** le reçu signé APPLYING dépasse64Mio sans dépasser128Mio et les fichiers correspondent déjà aux candidats
- **THEN** le propriétaire reprend le même reçu sans rejouer les écritures et vérifie l’absence avant APPLIED

#### Scenario: Pairs avancés après application
- **WHEN** le dernier marqueur d’époque du plan signé correspond exactement au disque, après application ordonnée et persistée, mais les pairs ont ensuite progressé
- **THEN** la reprise ne réécrit aucun candidat et exige l’absence actuelle des références ciblées avant APPLIED

#### Scenario: Marqueur ou absence divergents
- **WHEN** le marqueur final signé ne correspond pas ou une référence ciblée reste présente
- **THEN** aucune progression des pairs n’est écrasée et aucun APPLIED n’est inventé

### Requirement: Compatibilité de reprise identifiée
Le client corrigé2.4.1 MAY reprendre une transaction existante du protocole v1 avec `--runtime-version 2.4.0`, uniquement pour execute/finalize/verify. Il SHALL vérifier exactement cette version pour les quatre processus principaux, leurs PID et le même scope signé ; cette option SHALL NOT créer un nouvel effacement ou accepter une version arbitraire. Le certificat SHALL distinguer version du helper et version runtime ; le CABU global SHALL rester distinct.

#### Scenario: Reprise avant mise à jour globale
- **WHEN** un effacement2.4.0 reste engagé et le helper2.4.1 est qualifié
- **THEN** le même reçu peut être terminé en vérifiant les processus2.4.0, puis le CABU global peut actualiser toutes les briques

### Requirement: Recherche littérale exhaustive bornée par les données
La recherche des références SHALL conserver les contrôles typés et détecter les identifiants littéraux, y compris imbriqués. Elle SHALL éviter de multiplier le coût d’analyse par une grande alternance de motifs à chaque champ. Une référence restante ou une divergence SHALL conserver le refus, jamais être assimilée à une absence.

#### Scenario: Identifiants imbriqués
- **WHEN** plusieurs identifiants ciblés se recouvrent dans une chaîne
- **THEN** leur présence est détectée sans relâcher le refus d’absence
