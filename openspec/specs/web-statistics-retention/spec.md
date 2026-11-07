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
STATS MUST lire exclusivement SGS par IPC local et permettre une sélection du projet et du RUN. Les mesures natives, périodes de modèles, couvertures, événements paginés, sources de briques et contributions archivées MUST rester distincts et consultables. Aucune source contrôleur ne MUST remplacer SGS indisponible. Les champs absents MUST rester N/A et les métriques recouvrantes MUST NOT être additionnées. Les cumuls SGS MUST NOT être présentés comme des fenêtres temporelles non calculées.

#### Scenario: SGS indisponible
- **WHEN** le service statistique est inaccessible
- **THEN** STATS conserve son état d’indisponibilité sans substituer les anciens magasins du contrôleur

#### Scenario: Import et natif recouvrants
- **WHEN** SGS conserve des mesures natives et un rapport archivé du même change
- **THEN** STATS présente leurs provenances séparément sans les additionner

#### Scenario: Contrôleur indisponible
- **WHEN** le contrôleur est inaccessible mais SGS reste disponible
- **THEN** STATS présente les données de SGS sans substituer la panne du contrôleur à son état

### Requirement: Purge manuelle à borne explicite
La page STATS2.4 MUST NOT proposer la purge des anciens magasins statistiques du contrôleur. Les anciennes routes de rétention du moniteur MUST refuser une mutation sans effet. L’effacement terminal des buffers MUST passer par les reçus de clôture après rapport durable ; la suppression des copies archivées CAB MUST rester dans ARCHIVES et ne MUST NOT supprimer l’historique SGS validé.

#### Scenario: Ancienne route de purge
- **WHEN** un client appelle une ancienne route de rétention statistique depuis le moniteur
- **THEN** la requête est refusée sans purge SGS, RUN ou archive

#### Scenario: Borne exacte et annulation
- **WHEN** une ancienne prévisualisation est annulée ou un client transmet son ancienne borne de purge
- **THEN** aucune donnée n’est supprimée par les routes de rétention désactivées du moniteur2.4

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
