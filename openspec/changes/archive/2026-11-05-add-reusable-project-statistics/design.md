## Contexte et décisions

Le moteur est distribué dans `plugins/cab-approval-bridge/scripts/` et chargé par
le skill voisin `skills/sgs/`. `/SGS` demande toujours une reconstruction ; les
prompts de codage appellent directement les modes CHANGE puis DELTA.

Le contrat lisible reste SGS du référentiel résolu dans DEVOPS.md. Un format
JSON documenté fixe les contributions, les preuves et les indisponibilités.
Les extracteurs sont conservateurs ; INSPECT expose les mesures candidates et
les ambiguïtés. Une revue liée aux empreintes peut corriger une mesure avec
preuve de lignes, sans modifier les archives. Elle est conservée dans le
registre afin de rendre l'extraction contrôlable et le delta reproductible.

Les rapports de change contiennent un registre de sessions normalisé dans un
commentaire JSON borné, et six sections lisibles. Les rapports historiques non
produits par le moteur sont conservés, puis amendés dans leurs sections.

L'état agrégé conserve sommes/effectifs et index de multiplicités ; DELTA retire
et ajoute une contribution sans reparcourir les autres sources historiques.
VERIFY peut comparer tout le registre lors d'une vérification explicite.

Les exports natifs sont optionnels et fournis explicitement avec rattachement
de contexte et couverture ; aucun parcours des états privés ni réseau implicite.
Les statistiques historiques gardent leur périmètre ; le stock de code actuel
est recompté séparément à partir de racines produit identifiées.

## Risques et limites

Markdown narratif non uniforme : extraction automatique suivie d'examen des
candidats et, si nécessaire, corrections sourcées. Une absence numérique ne
prouve pas zéro. Une couverture native partielle ne prouve pas un total.
La suppression préalable explicite du global n'a pas de retour arrière vers
l'ancien rapport ; une transaction échouée restaure son absence.


## Interface agnostique et consultation

La CLI/JSON est commune aux codeurs et orchestrateurs, en pilotage ou en direct.
Les identités d’agents sont libres et déclarées ; l’adaptateur CAB est facultatif.
QUERY lit le couple validé sous un verrou partagé déjà présent, sans récupération
ou création ; les filtres portent sur une contribution publiée et/ou une mesure.
INSPECT conserve la consultation directe des rapports, dont les changes ouverts.
La commande manuelle /SGS reste REBUILD. Les règles de mandats distincts de CAB
ne deviennent pas un prérequis pour les autres protocoles.
