## MODIFIED Requirements

### Requirement: Persistance durable des approbations
CAB SHALL enregistrer l'état courant des approbations dans un magasin persistant
avant de confirmer une transition métier. Le magasin SHALL garantir
l'exclusivité d'une instance pour un même espace persistant. Cette persistance
SHALL couvrir le RUN et sa reprise après interruption. Au démarrage d'une
nouvelle session CAB, l'orchestrateur SHALL purger les anciens états selon le
contrat de démarrage ; aucune trace ni décision de la session précédente SHALL
être restaurée automatiquement.

#### Scenario: Reprise d'une demande en attente
- **WHEN** le broker redémarre pendant la reprise du même RUN alors qu'une demande est PENDING
- **THEN** la demande reste récupérable avec le même identifiant et le même état métier

#### Scenario: Nouvelle session CAB
- **WHEN** l'orchestrateur démarre une nouvelle session après l'arrêt des ressources de l'ancienne
- **THEN** les anciens magasin, journal, checkpoints et états de supervision sont purgés ensemble
- **AND** aucune ancienne demande, décision ou trace de codage n'est restaurée

## ADDED Requirements

### Requirement: Purge sans consultation de l'historique
La purge de début de session SHALL supprimer le contenu des seuls espaces
runtime CAB résolus, y compris les fichiers de conflit Syncthing, sans lire
leur ancien contenu ni créer une sauvegarde. Elle SHALL NOT toucher les
sources, secrets, configurations, rapports ou historiques natifs des agents.
L'inode du verrou du broker MAY être conservé vide pour assurer l'exclusion
pendant la purge ; ses anciennes métadonnées SHALL être supprimées.

#### Scenario: Journal orphelin ou fichier de conflit
- **WHEN** l'ancien état CAB contient un journal incohérent ou des fichiers sync-conflict
- **THEN** la nouvelle session purge l'intégralité de cet état sans tenter de le réparer ou de rejouer ses décisions

#### Scenario: Fichier extérieur référencé par un lien interne
- **WHEN** l'espace CAB contient un lien symbolique vers un fichier extérieur
- **THEN** la purge supprime le lien sans lire ni supprimer sa cible
