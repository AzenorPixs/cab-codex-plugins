# web-statistics-retention Specification

## Purpose
Présenter les statistiques CAB dans une page STATS locale, avec provenance,
couverture et sélection explicites, et permettre une purge manuelle des
historiques par leur propriétaire sans modifier les RUN ni les preuves métier.

## Requirements

### Requirement: Navigation statistique
L'interface MUST afficher STATS sous MONITOR, identifier la page sélectionnée et permettre le retour au moniteur sans modifier les RUN. La navigation MUST être accessible au clavier et responsive.

#### Scenario: Retour au moniteur
- **WHEN** STATS puis MONITOR sont sélectionnés
- **THEN** chaque page est affichée et la supervision SSE reste fonctionnelle

### Requirement: Statistiques filtrées et explicites
STATS MUST proposer current, last, 24h, 7d et 30d ainsi qu'un filtre RUN. Les agrégats MUST provenir des JSON statistiques gérés par le contrôleur via une projection HTTP bornée, sans lecture privée par le moniteur. Provenance, dates, couverture, troncature et limites MUST être visibles. Les sources recouvrantes MUST NOT être additionnées. Les métriques cumulatives MUST rester distinctes des fenêtres ; les métriques absentes MUST rester N/A.

#### Scenario: Import et natif recouvrants
- **WHEN** une fenêtre contient des données natives et un jeu importé
- **THEN** la page présente les sources séparément et signale les lacunes sans inventer de total commun

#### Scenario: Contrôleur indisponible
- **WHEN** la source statistique devient inaccessible
- **THEN** la page reste accessible et marque les dernières données comme anciennes avec date du dernier succès

### Requirement: Purge manuelle à borne explicite
La purge MUST accepter seulement 1, 3, 7, 30 et 365 jours, avec une borne UTC stricte attribuée côté serveur. Elle MUST exiger une prévisualisation puis une confirmation explicite d'un jeton opaque valide pendant cinq minutes. Une dérive des candidats ou protections MUST refuser la confirmation. Une répétition du jeton confirmé MUST retourner le reçu existant sans nouvel effet tant qu'il est retenu.

#### Scenario: Borne exacte et annulation
- **WHEN** une donnée est exactement à la borne ou la prévisualisation est annulée
- **THEN** cette donnée n'est pas supprimée et l'annulation ne modifie aucun magasin

### Requirement: Protection du fonctionnement CAB
La purge MUST retirer uniquement les historiques statistiques admissibles. Elle MUST préserver les contextes RESERVED ou courants du registre, les segments mixtes et les jeux importés protégés. Elle MUST NOT supprimer les fichiers opérationnels ni les preuves métier. Les agrégats globaux non décomposables MUST être conservés avec une limite explicite. Le choix 365 jours MUST NOT prolonger la rétention native.

#### Scenario: Historique et contexte actif
- **WHEN** des éléments anciens concernent un contexte actif et un contexte historique terminé
- **THEN** seuls les éléments admissibles du contexte historique sont retirés et aucun RUN n'est modifié

### Requirement: Persistance et concurrence de maintenance
Le propriétaire MUST sérialiser purge, imports et écritures statistiques. Chaque magasin MUST utiliser un remplacement atomique privé et refuser liens ou fichiers non ordinaires. Le résultat MUST exposer les suppressions effectivement persistées par magasin. Un échec partiel MUST NOT être annoncé comme réussite globale. La purge confirmée MUST être annoncée irréversible sans sauvegarde préalable et MUST NOT être déclenchée automatiquement.

#### Scenario: Erreur du second magasin
- **WHEN** le premier magasin est persisté mais l'écriture du second échoue
- **THEN** le reçu expose un échec partiel avec les seules suppressions confirmées du premier et conserve le second

### Requirement: Routes locales fermées
Les routes statistiques MUST accepter uniquement des sélections, identifiants et champs prévus. Les routes POST MUST exiger JSON et un en-tête dédié, vérifier Host loopback et origine cohérente ; le moniteur MUST exiger une origine identique. Corps, délais, listes et reçus MUST être bornés. Aucun chemin de fichier ou proxy arbitraire MUST être accepté.

#### Scenario: Requête interorigine
- **WHEN** une confirmation provient d'une autre origine ou contient un chemin arbitraire
- **THEN** elle est refusée avant toute mutation
