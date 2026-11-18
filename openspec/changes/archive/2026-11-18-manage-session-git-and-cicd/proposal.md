# Orchestration Git des sessions et livraison par CAB

## Objectif

CAB conserve un instantané Git par change, attribue les fichiers validés aux sessions, prépare leurs changements dans des index isolés et orchestre la livraison Git et les publications DIU. Les agents sollicitent CAB pour les opérations Git et transmettent la version de livraison ; CAB met à jour `PROJECT_VERSION` dans le `project.env` du projet concerné.

## Périmètre

- Instantané PostgreSQL `git_changes`, lié au change et au projet, et suivi des index et fichiers par session.
- Indexation groupée des fichiers d'une étape validée, contrôle des changements préexistants, des fichiers concurrents, des suppressions et des issues incertaines.
- Commit et tag de la version à partir du seul index de session ; conservation des autres index et des fichiers du projet.
- Envoi CAB de la branche et du tag vers chaque forge configurée, puis builds et releases DIU conditionnels.
- Outils MCP, contrat de session et interface de consultation, reçus durables et conservation à l'archivage.
- Tests ciblés, documentation, archivage du seul change et livraison SCM avec CI/CD.

## Hors périmètre

Aucune modification des autres branches ou de DIU. L'adaptation des prompts partagés et le rattachement interprojets générique restent limités aux projets et chemins explicitement autorisés, sans falsification des identités natives. Aucun envoi d'autres tags ou synchronisation destructive des forges n'est induit par la livraison.
