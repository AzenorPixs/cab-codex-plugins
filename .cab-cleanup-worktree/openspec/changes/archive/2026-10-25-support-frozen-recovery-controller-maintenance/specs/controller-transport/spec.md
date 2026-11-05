## ADDED Requirements

### Requirement: Diagnostic public de métadonnées sans mutation
L'outil approval-metadata MUST projeter uniquement les métadonnées d'une approbation demandée depuis une sortie native broker_health déjà disponible dans une session technique existante. Il MUST utiliser seulement GET et MUST NOT lire le magasin privé, lancer un outil, créer une session, exposer titre/résumé/commande/fichiers/secrets ou annuler une demande. Les identités absentes MUST rester non vérifiables.

#### Scenario: Demande non attribuée
- **WHEN** le diagnostic trouve l'identifiant demandé dans le watchdog natif mais ne trouve pas son RUN
- **THEN** il restitue l'observation, sa provenance et les champs inconnus sans attribuer ou décider la demande

### Requirement: Adoption contrôlée de l'amorçage
POST /coordination/maintenance/adopt MUST lire la transaction dans un journal privé fermé, vérifier autorité, empreintes, expiration, identités des processus et preuve native fraîche. Il MUST lier le reçu à la génération DRAINING existante avant de confirmer HELD. Un reçu client seul MUST NOT suffire.

#### Scenario: Reçu divergent
- **WHEN** le journal, l'autorité, le code chargé ou la génération diverge
- **THEN** l'adoption est refusée sans modification du job, du registre ou d'une permission

### Requirement: Maintenance de récupération préparée sans effet
Seule la récupération préparée nommée et prouvée sans outil natif dans la candidate MAY être admise pour confirmation ou libération SHARED_MAINTENANCE. RUN/job/candidate/recovery, propriétaire, opération, préfixes et critères MUST rester identiques. retry, complete et ask/once MUST rester inchangés.

#### Scenario: Prévol commencé
- **WHEN** une commande, un accès, une décision approved ou une preuve incertaine existe
- **THEN** la maintenance spéciale est refusée et la récupération reste gelée

### Requirement: Magasin privé d'amorçage explicite
OC_Codex_MAINTENANCE_STATE_DIR MAY désigner un répertoire absolu privé hors workspace, sans liens. Par défaut le contrôleur MUST utiliser frozen-controller dans son magasin privé update. Le lecteur MUST vérifier propriétaire, mode et régularité et MUST NOT suivre un chemin fourni par le corps HTTP.

#### Scenario: Chemin client arbitraire
- **WHEN** un client tente de choisir un autre fichier ou un journal non privé
- **THEN** l'adoption est refusée sans lire ce chemin
