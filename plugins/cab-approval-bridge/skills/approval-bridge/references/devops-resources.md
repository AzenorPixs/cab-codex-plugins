# Ressources DevOps des ateliers — CAB2.4.4

DEVOPS.md décrit les ressources du projet sur la machine courante. Avant chaque
nouvel atelier_execute, le broker lit localement ce seul document (UTF-8, fichier
régulier sans lien, plafond1Mio/256déclarations), extrait les chemins déclarés,
les résout et conserve son SHA-256. Le texte n’est jamais exécuté ; project.env,
les variables et les secrets ne sont ni chargés ni copiés. Les droits du compte
OpenCode restent opposables. Une déclaration ne prouve pas un test réussi.

| Ressource déclarée | Disponibilité et autorité |
|---|---|
| Exécutables, interpréteurs et bibliothèques locaux | Préfixes bin/lib et cibles des liens montés RO, PATH des exécutables déclarés ; venv du projet prioritaire. Dépendances locales/transitives disponibles dans leurs arbres installés. Aucun environnement hôte importé. |
| Python/Cython/Nuitka, Node/npm, Go, outils de compilation | Essais autonomes dans l’atelier propre ; sorties, caches et HOME/TMPDIR propres au RUN. Aucun téléchargement implicite, réseau isolé, stdin fermé. |
| Navigateurs headless | Documents locaux de test dans l’atelier. Un accès web garde sa validation CAB ; le lanceur ne l’active pas. |
| PostgreSQL client | Client local disponible RO. Une requête serveur utilise sa voie CAB validée, et les identifiants restent dans leur mécanisme privé. |
| Docker/LXC et services distants | Utiliser les réservations et voies CAB existantes. Ne pas monter un socket de contrôle dans l’atelier, désactiver son isolation ou allouer une ressource nouvelle. |
| Périphériques, sockets et répertoires de données | Catalogue avec cab-access-required ; leur présence ne vaut ni ouverture ni permission. |
| Ressource absente, inaccessible, protégée ou non configurée | Diagnostic explicite, aucune installation ni substitution de version silencieuse. Continuer les travaux indépendants. |

atelier_status sur une identité valide encore sans reçu renvoie found:false et
devops_resources : catalogue/empreinte/états observés. Le résultat d’un essai
contient le catalogue effectivement utilisé. Après régénération de DEVOPS.md,
un nouvel essai recalcule l’inventaire ; une identité déjà INTENT/RUNNING ou
terminale renvoie son reçu d’origine sans relance, même si DEVOPS.md a changé.
Les ressources affichées read-only sont montables, pas qualifiées métier.

Les tests de qualification vérifient chaque ressource disponible déclarée,
avec résultat réussi/échoué/non vérifiable et cause. Réutiliser une preuve
existante pertinente : LXC déjà validé par PA01 ne se réalloue ni ne se rejoue
pour cette mise à jour. Tout résultat d’essai reste soumis à l’orchestrateur.
Une ressource supplémentaire ou un effet hors change relève du développeur.

Ce profil isole les commandes d’atelier ; le processus OpenCode entier ne
devient pas globalement en lecture seule. Les règles normales d’écriture
projet hors atelier et les protections des ateliers pairs restent inchangées.
