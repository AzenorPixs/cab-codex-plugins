## ADDED Requirements

### Requirement: Persistance partagée des RUN concurrents
Le démarrage ou la clôture d’un RUN concurrent MUST conserver le magasin, le journal et les décisions des autres RUN. La purge globale MUST être refusée tant qu’une réservation active existe. Le registre MUST conserver les requestId déjà admis après crash sans rejouer leur permission.

#### Scenario: Isolation concurrente
- **WHEN** un deuxième RUN rejoint le broker
- **THEN** les preuves existantes restent intactes

## MODIFIED Requirements

### Requirement: Persistance durable des approbations
CAB SHALL enregistrer l'état courant des approbations dans un magasin persistant
avant de confirmer une transition métier. Le magasin SHALL garantir
l'exclusivité d'une instance pour un même espace persistant. Cette persistance
SHALL couvrir le RUN et sa reprise après interruption. Lors d'une
réinitialisation globale exclusive CAB, l'orchestrateur SHALL purger les anciens états selon le
contrat de démarrage ; aucune trace ni décision de la session précédente SHALL
être restaurée automatiquement.

#### Scenario: Reprise d'une demande en attente
- **WHEN** le broker redémarre pendant la reprise du même RUN alors qu'une demande est PENDING
- **THEN** la demande reste récupérable avec le même identifiant et le même état métier

#### Scenario: Nouvelle session CAB
- **WHEN** l'orchestrateur démarre une réinitialisation globale exclusive après libération et arrêt des ressources de tous les RUN
- **THEN** les anciens magasin, journal, checkpoints et états de supervision sont purgés ensemble
- **AND** aucune ancienne demande, décision ou trace de codage n'est restaurée

### Requirement: Purge sans consultation de l'historique
La purge de début de session SHALL supprimer le contenu des seuls espaces
runtime CAB résolus, y compris les fichiers de conflit Syncthing, sans lire
leur ancien contenu ni créer une sauvegarde. Elle SHALL NOT toucher les
sources, secrets, configurations, rapports ou historiques natifs des agents.
L'inode du verrou du broker MAY être conservé vide pour assurer l'exclusion
pendant la purge ; ses anciennes métadonnées SHALL être supprimées.

#### Scenario: Journal orphelin ou fichier de conflit
- **WHEN** l'ancien état CAB contient un journal incohérent ou des fichiers sync-conflict
- **THEN** la réinitialisation globale exclusive purge l'intégralité de cet état sans tenter de le réparer ou de rejouer ses décisions

#### Scenario: Fichier extérieur référencé par un lien interne
- **WHEN** l'espace CAB contient un lien symbolique vers un fichier extérieur
- **THEN** la purge supprime le lien sans lire ni supprimer sa cible
