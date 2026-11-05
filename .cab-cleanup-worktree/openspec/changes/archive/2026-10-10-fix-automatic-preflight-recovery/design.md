## Décision

L'automatisation appartient à l'orchestrateur exécutant le protocole distribué.
Le contrôleur conserve le gel et refuse un prévol non prouvé. Aucun endpoint,
normaliseur d'arguments ou automate de décision n'est ajouté.

L'orchestrateur peut abandonner le seul job technique gelé et ouvrir une
nouvelle session CAB sans nouvelle confirmation lorsque l'historique natif
prouve une divergence ou une omission par rapport au mandat prescrit, un refus
explicite avant exécution et l'absence de tout effet. Cela inclut une demande
malformée rejetée avant enregistrement et un délai prescrit omis. Un simple
code 409, un délai MCP ou un texte de l'agent n'est jamais une preuve suffisante.
Un délai MCP ordinaire conserve le polling du même approval_id.

Avant chaque tentative : traiter les rapports, neutraliser les permissions et
demandes restantes sans approbation, prouver propriété/inactivité du contexte,
préserver un checkpoint métier hors runtime et vérifier les gardes existantes.
Purger seulement les deux espaces résolus avec l'outil distribué. Un effet
inconnu, un espace partagé, une preuve absente ou une purge partielle interdit
la reprise automatique et demande l'autorité indispensable.

Chaque nouveau prévol utilise des identifiants neufs, le change attendu et
exactement /usr/bin/true. Une décision explicite, une réponse MCP corrélée,
une permission once, exit 0 et readiness READY sans demande parasite restent
obligatoires. Une nouvelle divergence sûre relance la procédure, sans limite
de tentatives ni opérations simultanées, avec contrôle de progression à la
cadence existante. Elle ne termine pas le RUN parent et n'autorise jamais le
travail métier. Un arrêt explicite du développeur reste prioritaire.

## Périmètre et compatibilité

Les modifications de logique concernent les documents exécutables du
protocole. Broker, contrôleur et superviseur ne changent que de version.
Les décisions historiques ne sont pas normalisées ou réutilisées. Le processus
OpenCode, les sources et les archives du projet piloté restent préservés.
AGENTS.md, DEVOPS.md, schémas et dépendances ne sont pas modifiés.

## Validation et limites

OpenSpec strict avant implémentation ; tests de distribution du protocole et
des versions ; simulations HTTP de prévol malformé et de refus pour délai
omis ; suites Node/Python et gardes de purge existantes ; syntaxe et UTF-8/LF.
Les trois changes historiques sont comparés à leurs empreintes initiales.
La matrice documentaire est revue avant archivage de ce seul change.

SCM est direct : aucun service réel, appel fournisseur, purge réelle, mise à
jour du profil, commit ou push. Les tests isolés ne constituent pas une preuve
de récupération réelle d'un RUN OpenCode ; le correctif doit être distribué
avant d'être utilisé par une installation existante. Le rapport d'archive
comporte six sections avec N/A motivé pour les mesures non collectées.
