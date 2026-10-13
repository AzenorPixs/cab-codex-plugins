## Context

Sources : `controller-transport/spec.md`, exigences de restauration,
`cgpt-approval-bridge-controller.mjs`, bloc de lecture de `controller-job.json`,
et `controller-job-restoration.test.mjs`.
Le chargeur vérifie seulement la syntaxe JSON et un type object non nul.
La validation utilisée par /job/arm ne protège pas cette restauration.

## Goals / Non-Goals

Refuser un contrat inexploitable avant tout effet externe, sans perdre un job
valide ni ses preuves. Ne pas réinitialiser le runtime, réparer le fichier,
redéfinir le format persistant, modifier les décisions CAB ou la récupération.

## Décisions validées

- Distinguer la validation d'un contrat persisté de celle d'un nouvel armement :
  ne pas réinitialiser dates, jalons, gate, récupération ou sessions révoquées.
- Avant le correctif, inventorier les formes persistées produites par les
  versions supportées et les fixtures de restauration. Vérifier les identités,
  le répertoire absolu, les types et les champs obligatoires existants.
- Refuser `null`, booléens, nombres, chaînes, tableaux et objets incomplets.
  Préserver les extensions non sensibles compatibles ; ne pas inventer une
  règle de rejet des champs inconnus ni rendre obligatoire un champ historique
  facultatif sans décision séparée.
- ENOENT reste le seul cas de démarrage sans job. Une invalidité de contrat
  produit un diagnostic « contrat invalide », distinct des deux erreurs déjà
  documentées, sans reprise du contenu ou du chemin.
- Aucun fichier en erreur n'est réécrit et aucun service n'est démarré pour
  tenter une récupération automatique.

## Risques et compatibilité

Une validation trop stricte peut refuser un contrat historique valide.
Les fixtures des formats supportés sont un préalable à l'implémentation.
Toute ambiguïté sur un ancien format appelle une décision documentée, pas
une normalisation ou une migration implicite.

## Critères d'acceptation

1. Les racines invalides et contrats incomplets sont refusés avec code non nul
   avant HTTP, OpenCode et Codex App Server ; le fichier reste identique.
2. ENOENT permet toujours le démarrage sans job.
3. Les contrats valides conservent jalons, gate, strictCommands, gel,
   historique de récupération et sessions révoquées.
4. Les diagnostics ne contiennent ni marqueur synthétique sensible, ni chemin,
   ni exception brute.
5. La suite isolée de restauration et les régressions de récupération passent.

## Validation et réversibilité

Exécuter séparément les suites Node de restauration, configuration et
récupération, puis les contrôles de syntaxe et OpenSpec applicables.
Les tests HTTP emploient uniquement des fixtures et services simulés autorisés.
Le correctif ne réécrit pas les données ; son retour arrière porte sur les
sources seulement et ne constitue pas une autorisation de déploiement.

## Inventaire de compatibilité observé

Le constructeur courant /job/arm produit jobId, sessionId, directory, criteria
et armed. changeId peut être null dans le contrat persisté. strictCommands,
les dates, jalons, gate, récupération, historique et sessions révoquées restent
facultatifs pour les anciens contrats. Le contrat durable et son gate sont
tracés dans l'archive add-persistent-job-supervisor ; les métadonnées de reprise
sont conservées sans réinitialisation. Les types des champs connus sont vérifiés
quand ils existent, et les extensions compatibles restent intactes. Les tests
couvrent le format minimal et un contrat avec gel et sessions révoquées, ainsi
que la reprise complète par les suites de récupération. Aucun runtime réel
historique ou fichier exclu n'a été consulté.
