# Réconciliation d'une discovery historique sans effet

## Contexte

Un RUN existant peut conserver une recovery préparée par une version CAB
antérieure au marqueur `requestValidationSignatureHash`. Une discovery Code
Mode native exacte, survenue après le gel mais sans permission ni effet,
se retrouve alors dans le transcript que `complete` vérifie. Le prévol
approuvé et consommé ne peut être rejoué.

## Décision

Dans le seul cas d'une recovery RUN héritée sans signature scellée, classifier
une partie normalisée `cab_codemode_discovery` comme observation read-only si
elle prouve un unique `search` natif complet, non tronqué, horodaté et littéral
pour `request_validation`. En autoriser une au plus où qu'elle apparaisse dans
le transcript post-prepare vérifié par `complete`, sans la compter comme broker
tool ni effet. Rejeter les doublons, les appels MCP multiples, les retours
transformés et les autres outils.

Les recoveries signées restent strictes : `currentRecoveryTools` continue de
refuser toute discovery après le préfixe scellé. Les contrôles de décision,
permission, commande, readiness, job, RUN et fencing restent inchangés.

## Réconciliation

L'empreinte du préfixe capturé avant `prepare` reste vérifiée. Toutes les
parties post-prepare, y compris la discovery tolérée, sont contrôlées selon
le contrat de séquence. Le marqueur legacy et le contrat courant distinguent
la compatibilité historique d'une récupération nouvellement préparée. Aucun
état décisionnel ou consommateur n'est reconstruit depuis un texte, une
readiness ou une simple présence d'outil.
