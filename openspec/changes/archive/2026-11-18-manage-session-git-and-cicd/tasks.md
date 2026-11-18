# Tâches — code non attribué

## Sous-lots normalisés

- Repère provisoire `manage-session-git-and-cicd` — instantané, attribution et index isolés : tâches 1–2 ; état À FAIRE ; contrôles ciblés et preuve de concurrence requis.
- Repère provisoire `manage-session-git-and-cicd` — livraison et protocole : tâches 3–5 ; état À FAIRE ; dépend de l'index isolé, des forges et de DIU ; vérification des effets et reçus requise.
- Repère provisoire `manage-session-git-and-cicd` — qualification et livraison : tâches 6–7 ; état À FAIRE ; dépend des unités précédentes et de leurs preuves.

## Réalisation

- [x] 1. Conserver en PostgreSQL l'instantané Git initial lié au change et aux sessions, sans contenu secret.
- [x] 2. Attribuer les fichiers validés et gérer les index isolés, conflits, reprises et conservation après archivage.
- [x] 3. Orchestrer par CAB la version, le commit et le tag limités à la session, puis les envois protégés aux forges.
- [x] 4. Orchestrer les builds DIU conditionnels et le report explicite des releases, avec reçus et gestion des résultats incertains.
- [x] 5. Adapter les interfaces CAB, MCP, le protocole CAB distribué et le plugin CICD pour que les agents utilisent exclusivement CAB pour Git.
- [x] 6. Exécuter les contrôles ciblés hôte et OpenSpec, réviser les cadrages, la documentation et le changelog.
- [x] 7. Archiver ce change et vérifier les statistiques CAB ; la livraison Git et les builds sont attestés séparément par les reçus de livraison.

## Décisions et preuves observées

- Capture initiale PG et rattachement natif interprojets vérifiés sur l'hôte, sans changement d'identité.
- Adoption du RUN antérieur testée dans une transaction PG annulée, puis adoption réelle de 58 chemins autorisés.
- Première indexation de ces 58 chemins confirmée par CAB dans l'index isolé ; HEAD et les tags utilisateur inchangés à cette étape.
- Les builds restent ceux de DIU sur le projet courant. Le développeur conserve le seul tag 3.2.16 et diffère explicitement les releases DIU.
- Le développeur demande d'attendre la fin des travaux déjà présents dans le dépôt des prompts avant de l'adapter. Le RUN CAB-GIT-PROMPTS-20261118 est en pause ; aucun prompt n'a été modifié et leur publication ne fait pas partie de la présente livraison CAB.

- Contrôles observés : 12 tests ciblés, compilation TypeScript/Vite, contrôle Django et validation OpenSpec stricte ; le contrôle CAB à chemin relatif a échoué puis a été révisé vers le chemin absolu, sans effacer son reçu. Un contrôle final distinct est requis après archivage.
- Le validateur de skill fourni n'a pas pu être exécuté faute de PyYAML dans les Python DEVOPS ; le JSON, le frontmatter, les liens MCP et la cohérence des quatre payloads ont été contrôlés sans ajout de dépendance.

- Archivage réussi sous 2026-11-18-manage-session-git-and-cicd ; l'index isolé, son arbre et son commit de base ont été vérifiés présents après le déplacement. Le mandat a été réconcilié par CAB.
- Le rapport STATISTICS.md archivé existe en UTF-8/LF avec ses six sections et reste produit par CAB. La publication et les builds restent à prouver par le reçu CI/CD, sans cocher artificiellement une release DIU différée.
