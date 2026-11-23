## ADDED Requirements

### Requirement: Fabrique des artefacts de projet
Le détail d’un projet MUST exposer le lien Fabrique et sa page `/projects/<ID>/factory`. Elle MUST reprendre le menu, le titre avec séparateur et les cartes responsives des Forges. Chaque carte MUST être activée par l’indicateur Debian ou Docker du projet.

#### Scenario: Artefacts déjà générés
- **WHEN** le projet active la construction Debian ou Docker
- **THEN** CAB affiche les derniers paquets par nom et architecture ou la dernière image locale observée
- **AND THEN** les métadonnées de tous les projets sont conservées dans `project_artifacts` en PostgreSQL et réobservées en arrière-plan

#### Scenario: Génération manuelle
- **WHEN** un administrateur demande une construction pour un format activé
- **THEN** CAB met en file la fonction native correspondant au bouton et affiche son état
- **AND THEN** Debian utilise la recette déclarative et Docker le contexte et les arguments publics compatibles avec DIU
- **AND THEN** une construction manuelle ne remplace pas un artefact existant de même version dont le contenu ou la configuration diffère

#### Scenario: Nouvelle observation après succès
- **WHEN** une construction locale réussit
- **THEN** CAB observe le résultat et le rend disponible dans la Fabrique sans relancer la construction
