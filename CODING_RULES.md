# CODING_RULES.md — Règles générales par langage

Version : 0.1

Ce référentiel commun contient les règles générales par langage.
Les règles communes, autorisations et priorités restent définies dans
[AGENTS.md](AGENTS.md). Consulter uniquement les sections des langages
concernés avant modification, puis appliquer les conventions propres
au projet de `TECHNICAL.md` et les outils et configurations de `DEVOPS.md`.
Ces documents ne dispensent d'aucune validation requise.

## Bash et Shell

Les scripts DOIVENT être compatibles avec Bash des versions Debian
supportées et respecter l'interpréteur du shebang : aucun Bash spécifique
dans un script `sh`. Privilégier POSIX lorsque le résultat reste simple.

Vérifications minimales : `bash -n "<fichier>"` ou `sh -n "<fichier>"`
selon l'interpréteur cible, puis `shellcheck "<fichier>"`.

Les scripts DOIVENT protéger les expansions nécessaires par des guillemets,
préserver arguments et chemins avec espaces ou caractères spéciaux,
contrôler les retours influençant la suite, traiter explicitement les échecs
attendus et retourner un code cohérent. `set -e` ne remplace pas cette gestion.

## Python

Respecter la plage Python de `pyproject.toml` et les versions effectivement
supportées ; utiliser l'interpréteur et l'environnement retenus par le projet.
Privilégier la bibliothèque standard si elle répond simplement au besoin.

Le code DOIT capturer des exceptions précises lorsque nécessaire, préserver
leur cause en cas de transformation, éviter les captures générales masquant
les erreurs, employer les gestionnaires de contexte adaptés et éviter
les arguments par défaut mutables et effets de bord inutiles à l'import.

Privilégier les annotations de types pour les nouveaux contrats publics
et interfaces dont elles améliorent la compréhension.

Pour chaque fichier modifié : `python3 -m py_compile "<fichier.py>"`.
Exécuter les tests applicables avec le mécanisme du projet et les contrôles
de style, analyse statique et types configurés pour le périmètre.

Pour Django, respecter les conventions du projet sur les modèles,
migrations, transactions, contrôles et tests.

## JavaScript et TypeScript

Respecter Node.js, navigateurs et outils de construction supportés,
le système de modules, les conventions et contrats API existants.
Toute conversion JavaScript ↔ TypeScript nécessite une demande ou validation
concernant cette conversion.

Le code DOIT traiter explicitement les rejets et promesses abandonnées,
libérer les abonnements, écouteurs et temporisateurs nécessaires et valider
les données externes à l'exécution. Les types TypeScript ne remplacent
pas cette validation ; `any` et suppressions de diagnostic DOIVENT être
limités et justifiés.

Avant validation, exécuter les tests et constructions applicables avec
les commandes et configurations du projet, ainsi que lint et contrôles
de types configurés. Les tests unitaires frontend requis DOIVENT s'exécuter
dans les navigateurs de `DEVOPS.md`, en mode headless.

Toute modification d'interface nécessite les vérifications navigateur
applicables : la construction seule ne valide ni visuel ni interactions.

## SQL et PostgreSQL

Requêtes et migrations DOIVENT respecter les versions PostgreSQL supportées.
Les valeurs externes DOIVENT être paramétrées, jamais concaténées au SQL ;
les identifiants dynamiques DOIVENT utiliser les mécanismes adaptés
du pilote ou de l'ORM.

Les modifications DOIVENT respecter contrats de données et isolation,
préserver contraintes et intégrité, utiliser les transactions nécessaires
à l'atomicité, traiter explicitement erreurs et conflits attendus et
documenter les impacts des migrations et leur retour lorsque applicable.

Privilégier l'ORM et les migrations existants s'ils répondent au besoin.
Les vérifications DOIVENT utiliser les outils de migration et tests
applicables dans un environnement de test autorisé. Exécuter du SQL
ne constitue pas une simple vérification syntaxique sans effets de bord.

## HTML, CSS et autres langages

HTML/CSS DOIVENT respecter navigateurs cibles, conventions de composants,
thèmes, accessibilité et comportement responsive du projet, avec construction
et contrôles navigateur applicables.

Pour tout autre langage, l'agent DOIT identifier versions supportées,
conventions, outils de vérification configurés et tests applicables,
appliquer les règles communes et signaler tout mécanisme de validation absent.

