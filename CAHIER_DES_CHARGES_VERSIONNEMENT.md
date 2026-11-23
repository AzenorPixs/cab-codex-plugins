# Cahier des charges — Gestion des versions dans CAB

Date : 21 novembre 2026  
Spécification de mise en œuvre : [change OpenSpec](openspec/changes/archive/2026-11-21-manage-project-versioning-and-track-change-stages/proposal.md).

## Version et politique du projet

`PROJECT_VERSION` indique la version courante. La nouvelle variable `PROJECT_VERSION_POLICY` indique la politique applicable. Sa valeur est un entier de 1 à 7 qui fixe à la fois le nombre de composantes de la version et le sens de chacune.

Les deux variables suivent le mécanisme de configuration des projets de CAB. `project.env` reste la source de vérité. PostgreSQL reflète la valeur du fichier et sert notamment à l’affichage dans Overview.

CAB détecte l’absence de `PROJECT_VERSION_POLICY` à l’enregistrement et à la synchronisation de tout projet géré. Il déclare automatiquement la variable dans `project.env`, puis la projette dans PostgreSQL. Si une version courante valide existe, CAB déduit la politique du nombre de ses composantes. Si aucune version n’est encore définie, CAB initialise la politique à 3. Cela ne crée ni version initiale ni tag. Une version renseignée mais illisible ou hors des formats pris en charge déclenche un diagnostic. Une politique déjà déclarée est conservée et toute incohérence avec la version courante est signalée.

## Les sept politiques

Chaque composante est un entier décimal non négatif. Les composantes sont séparées par des points. Elles sont indépendantes et peuvent dépasser 9. La position 1 est celle de gauche.

| Politique | Signification des composantes, de gauche à droite |
| --- | --- |
| 1 | Version du projet, avec ses modifications. |
| 2 | Version du projet → modification de toute nature. |
| 3 | Version du projet → modification ou ajout d’une fonctionnalité → correctif ou patch. |
| 4 | Version du projet → ajout d’une fonctionnalité → modification d’une fonctionnalité → correctif ou patch. |
| 5 | Version majeure du projet → version mineure du projet → ajout d’une fonctionnalité → modification d’une fonctionnalité → correctif ou patch. |
| 6 | Version majeure du projet → version mineure du projet → ajout d’une fonctionnalité → modification majeure d’une fonctionnalité → modification mineure d’une fonctionnalité → correctif ou patch. |
| 7 | Version majeure du projet → version mineure du projet → ajout d’une fonctionnalité → modification majeure d’une fonctionnalité → modification mineure d’une fonctionnalité → correctif ou patch majeur → correctif ou patch mineur. |

CAB calcule une version candidate en ajoutant 1 à la composante choisie et en mettant à zéro la composante immédiatement à sa droite, si elle existe. Les autres composantes conservent leur valeur. En politique 4, incrémenter la deuxième composante de `2.9.4.7` donne `2.10.0.7`. Incrémenter la dernière donne `2.9.4.8`. Le calcul utilise `PROJECT_VERSION` comme point de départ et ne réserve aucun numéro.

## Étape obligatoire de lecture du skill Version

CAB fournit un skill **Version**, maintenu dans son projet source et déployé auprès des agents de codage et des orchestrateurs. Le skill décrit les sept politiques, les règles de calcul de CAB et les critères qui aident le LLM à rattacher la portée de la spécification prise en charge à une composante.

Le cycle de session de codage passe de **11 à 12 étapes**. CAB insère en sixième position l’étape « Lire le skill Version et évaluer le périmètre de version » après la mise à disposition de la spécification retenue et avant toute proposition d’évolution de version. Si la session ne dispose pas encore d’une spécification, sa création précède obligatoirement cette étape. Si elle en dispose déjà, CAB attend que la spécification applicable soit identifiée pour le RUN. Le LLM peut ainsi confronter le périmètre réel de la session à la politique du projet.

CAB demande la lecture à l’agent de codage en session directe et à l’orchestrateur en session pilotée. L’agent désigné retourne à CAB un accusé de réception explicite attestant qu’il a lu et compris le skill. CAB vérifie l’identité de l’émetteur et rattache le reçu au RUN, au mode, à la spécification et à la version du skill utilisée. CAB valide l’étape à réception d’un accusé admissible. Une déclaration d’avancement seule ne valide pas l’étape. Tant que le reçu manque, CAB indique le prérequis et refuse toute proposition d’évolution de version.

Le cycle, les interfaces de progression et les contrats de clôture adoptent le total de 12 étapes. Les reçus terminaux historiques conservent leur numérotation d’origine.

## Choix par l’agent de codage

L’agent de codage lit la politique du projet, examine la spécification prise en charge, choisit la composante à incrémenter et motive son choix. CAB calcule le numéro correspondant. L’agent peut examiner plusieurs candidats puis retient celui qu’il propose pour la livraison. Une version imposée par le développeur prime sous réserve des contrôles d’admission.

En direct, le codeur déclare son choix. En piloté, l’orchestrateur transmet au codeur le cadrage de version établi après sa lecture du skill. Le codeur choisit le numéro et le transmet à l’orchestrateur, qui le déclare dans CAB. Le contrat OpenSpec actuel confie à l’orchestrateur le choix et la déclaration en mode piloté. La nouvelle répartition doit donc y être inscrite. Le reçu permet de retrouver la version initiale, la politique, la composante choisie, le numéro retenu et les acteurs concernés.

## Changement de politique dans Overview

`PROJECT_VERSION_POLICY` fait partie des variables modifiables du projet. Quand un utilisateur habilité change sa valeur, Overview lui demande comment convertir les numéros et montre les effets avant la validation.

- **Augmentation** : choisir l’ajout des composantes `0` à gauche ou à droite. De la politique 3 à la politique 5, `2.4.7` devient `0.0.2.4.7` à gauche ou `2.4.7.0.0` à droite.
- **Réduction** : choisir quelles composantes supprimer. Le choix proposé dans Overview consiste à retirer le nombre requis de composantes à gauche ou à droite. De la politique 4 à la politique 3, `2.4.7.9` devient `4.7.9` en retirant à gauche ou `2.4.7` en retirant à droite.

CAB applique la même transformation à `PROJECT_VERSION`, si elle est renseignée, et à tous les tags de version cohérents avec l’ancienne politique dans le dépôt Git local, si celui-ci existe. CAB parcourt l’ensemble des tags locaux, y compris ceux qui ne sont pas accessibles depuis la branche courante. Les tags hors format restent en place. Les tags historiques préfixés reconnus par CAB sont évalués sur leur partie numérique. L’aperçu montre le nom cible exact pour chacun. Les tags convertis pointent vers les mêmes objets Git que les tags d’origine. L’opération dans Overview est locale.

L’aperçu présente la version courante et sa cible, les noms des tags avant et après, ainsi que les collisions éventuelles. Si deux tags aboutissent au même nom, si une destination est déjà occupée par un tag hors conversion ou si l’état a changé depuis l’aperçu, CAB refuse l’application et explique le conflit. CAB ne fusionne ni n’écrase de tags. Une annulation de l’aperçu laisse le projet intact.

Après validation, CAB coordonne la mise à jour de `project.env`, la conversion Git locale et la projection PostgreSQL. La migration n’est déclarée réussie qu’après vérification de leur concordance. Le change OpenSpec précisera les verrous, le reçu durable et la récupération en cas d’interruption entre ces opérations. En l’absence de dépôt local, CAB applique la conversion de configuration sans étape Git. Un dépôt présent mais inaccessible bloque la migration.

## Suivi des étapes par change

Le change possède douze étapes identifiées et leurs itérations. CAB enregistre
les dates de début et de fin à partir des événements du RUN. Un retour à une
étape ou une reprise dans un autre RUN ajoute un passage au même change.
Les durées courantes et cumulées sont consultables dans Overview. Les passages
simultanés contribuent chacun à la somme de travail. Les mesures absentes
restent signalées comme telles. CAB décrit ses jalons et le LLM peut ajouter
une description du travail de spécification, de mise en œuvre ou de revue.

## Livraison

CAB compare le nombre de composantes avant leur valeur numérique. Toute
version d’une politique supérieure est classée au-dessus de toute version
d’une politique inférieure. Ainsi, `0.3.8.0` est au-dessus de `4.0.0`.
Une réduction convertit les tags locaux après aperçu et confirmation. Les
tags distants d’une politique supérieure peuvent bloquer une nouvelle
livraison après réduction. Pour les tags annotés, CAB préserve l’objet exact,
avec son annotation et son nom interne. Les préfixes historiques existants
sont conservés lors de la conversion locale.

CAB revérifie la version source, la politique et l’admissibilité du numéro avant la livraison. Un changement de politique ou de version qui rend le choix périmé impose une nouvelle proposition. Les nouveaux tags de livraison restent égaux à la version, sans préfixe `v`. Les protections Git et le suivi par le même reçu restent applicables. La publication éventuelle des tags issus d’une conversion locale relève d’une décision distincte.

La livraison de session accepte actuellement trois ou quatre composantes. La mise en œuvre doit étendre de manière cohérente les validateurs, la mise à jour de `PROJECT_VERSION`, la comparaison des tags et les parcours de publication aux sept politiques. Les intégrations qui refusent un format doivent le signaler avant tout effet. Le §7 de BUILD.md devra être aligné sur la convention courante des tags sans préfixe.

Sources : [contrat OpenSpec](openspec/specs/system-platform/spec.md), [livraison de session](src/cab_platform/session_delivery.py), [règles de version et de tag](src/cab_platform/versioning.py).

## Critères de recette

| Cas | Résultat attendu |
| --- | --- |
| Variable absente et version `3.8.4.2` | CAB écrit `PROJECT_VERSION_POLICY=4` dans `project.env`, puis projette la valeur 4 dans PostgreSQL. Une nouvelle synchronisation conserve la valeur. |
| Variable et version absentes | CAB déclare la politique 3 et ne crée ni version initiale ni tag. |
| Valeur PostgreSQL divergente | La synchronisation rétablit dans PostgreSQL la valeur lue dans `project.env`. |
| Session sans spécification | CAB attend la création de la spécification avant d’exiger la lecture du skill Version. |
| Session avec une spécification existante | CAB exige la lecture après rattachement de la spécification applicable au RUN. |
| Accusé de réception absent ou émis par un autre acteur | L’étape reste en attente et CAB refuse la proposition. L’accusé du codeur en direct ou de l’orchestrateur en piloté valide l’étape. |
| Progression du nouveau cycle | CAB affiche 12 étapes et la clôture du nouveau cycle correspond à la douzième. Les reçus historiques sont conservés. |
| Calcul dans les sept politiques | La composante choisie augmente de 1, la suivante passe à 0 si elle existe, les autres conservent leur valeur. Le calcul ne modifie ni les fichiers ni Git. |
| Augmentation ou réduction dans Overview | L’utilisateur choisit le sens, vérifie les conversions puis confirme. La version courante et les tags locaux concernés adoptent la nouvelle politique. Les objets Git et les tags hors format sont préservés. |
| Deux tags convergent lors d’une réduction | Overview identifie les tags concernés et CAB refuse la migration avant tout changement. |
| État modifié depuis l’aperçu | CAB demande un nouvel aperçu avant de permettre la validation. |
| Aucun dépôt Git local | La politique est modifiable et la version courante est convertie si elle existe. |
| RUN piloté | Le choix revient au codeur. La livraison exige la déclaration du même numéro par l’orchestrateur. |
| Conflit Git ou choix périmé à la livraison | CAB indique le motif du refus. Le codeur peut soumettre un nouveau choix après actualisation du contexte. |
| Réponse perdue après lancement | Le même reçu permet de suivre ou de réconcilier l’opération sans la rejouer. |

## Points à préciser dans OpenSpec

- Confirmer si la réduction proposée à gauche ou à droite doit aussi permettre de supprimer des positions intermédiaires.
- Définir la version initiale d’un projet à sa première livraison, ainsi que les règles de comparaison face à des tags distants d’une ancienne politique après une conversion locale.
- Détailler la traçabilité du choix du codeur en piloté, les droits Overview et la récupération d’une migration interrompue.
