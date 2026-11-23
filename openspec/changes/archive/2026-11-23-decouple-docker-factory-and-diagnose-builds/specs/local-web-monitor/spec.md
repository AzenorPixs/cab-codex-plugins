## MODIFIED Requirements

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

#### Scenario: Construction Docker indépendante des forges
- **WHEN** une configuration locale Docker valide est lue à la mise en file, au lancement ou à l’observation
- **THEN** un réglage de forge absent, invalide ou modifié ne bloque pas ces opérations
- **AND THEN** une construction réussie pose `latest` et la version du projet sans préfixe `v` sur la même image locale
- **AND THEN** la publication versionnée reprend l’identifiant de cette image locale, sans relancer le build, et contrôle le registre de la destination choisie

#### Scenario: Nouvelle observation après succès
- **WHEN** une construction locale réussit
- **THEN** CAB observe le résultat et le rend disponible dans la Fabrique sans relancer la construction

#### Scenario: Diagnostic d’une demande ou d’une construction en échec
- **WHEN** la demande manuelle de construction est refusée ou que la tentative lancée par l’utilisateur échoue
- **THEN** la Fabrique ouvre automatiquement l’Overview du format concerné et le détail reste réouvrable depuis sa carte
- **AND THEN** l’Overview indique l’état, l’étape atteinte, les contrôles et causes disponibles et, si observé, le code de sortie
- **AND THEN** les motifs concernant la configuration publique peuvent identifier la clé et sa ligne sans publier sa valeur, une sortie brute ou des données privées
