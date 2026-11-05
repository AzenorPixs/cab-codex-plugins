# Conception

La version de base est 1.2.0 dans toutes les annonces exécutables et dans
pyproject.toml. Le manifeste ajoute seulement un cachebuster Codex UTC neuf.
Les numéros de document, schémas, protocole MCP, références historiques 1.0.x
et archives 1.1.0 restent distincts de la version source courante.

Le catalogue marketplace local n'a pas de champ version : il reste inchangé et
ses chemins sont contrôlés. La commande versionnée et les unités distribuées
sont modifiées dans le dépôt seulement. Aucun fichier installé n'est remplacé.

Les quatre exigences de distribution annonçant encore 1.1.0 sont alignées par
un delta MODIFIED complet, en préservant toutes leurs clauses et scénarios.
Les cadrages actuels et le changelog reflètent 1.2.0 comme préparation source,
sans affirmer de publication ni de déploiement.

Vérifications : syntaxe, assertions existantes de distribution, régressions
séquentielles en fixtures temporaires, smoke OpenCode dans une instance isolée
si le binaire est disponible, OpenSpec strict et empreintes des fichiers protégés.
Aucune dépendance, migration ou nouvelle capacité n'est introduite. Le retour
aux fichiers source précédents est local ; le retour arrière d'un futur runtime
schéma 3 reste une opération coordonnée distincte.
