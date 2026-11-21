---
name: version
description: Évaluer le périmètre d’une spécification et proposer une version selon la politique du projet dans CAB.
---

# Version 1.0.0

Dans un RUN à douze étapes, lire ce skill après la création ou le
rattachement de la spécification et avant la proposition de version.
Consulter `session_git_context` pour vérifier le RUN, la politique et
l’autorité de lecture. En direct, le codeur confirme la lecture. En piloté,
l’orchestrateur la confirme et donne le cadrage de version au codeur.
Appeler `version_skill_acknowledge` avec le RUN, la révision `1.0.0` et
`confirmed=true` une fois le contenu lu et compris.

L’agent de codage choisit la composante qui représente la portée de la
spécification et des travaux. Utiliser la politique effective du projet.

| Politique | Composantes de gauche à droite |
| --- | --- |
| 1 | Version du projet, modifications comprises |
| 2 | Version du projet, modification |
| 3 | Version du projet, ajout ou modification de fonctionnalité, correctif |
| 4 | Version du projet, ajout de fonctionnalité, modification de fonctionnalité, correctif |
| 5 | Majeure, mineure, ajout de fonctionnalité, modification de fonctionnalité, correctif |
| 6 | Majeure, mineure, ajout de fonctionnalité, modification majeure de fonctionnalité, modification mineure de fonctionnalité, correctif |
| 7 | Majeure, mineure, ajout de fonctionnalité, modification majeure de fonctionnalité, modification mineure de fonctionnalité, correctif majeur, correctif mineur |

Le codeur appelle `version_propose` avec la position (1 à gauche) et le
motif du choix. CAB ajoute 1 à la composante choisie puis remet à zéro sa
voisine immédiate de droite si elle existe. Une version imposée par le
développeur se transmet par `explicit_version`, avec son motif et une
position neutre. En piloté, transmettre le choix à l’orchestrateur, qui
déclare le même numéro par `session_delivery_select_version`. En direct,
le codeur retient son choix dans la livraison autorisée.

Le nombre de composantes prime dans l’ordre des versions. Ainsi,
`0.3.8.0` est supérieure à `4.0.0`. Une conversion de politique est une
opération distincte effectuée dans Overview. La proposition ne change ni
Git ni la configuration du projet. Suivre CICD ou CICDF pour livrer.
