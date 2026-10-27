## Why

La commande distribuée est nommée `/cab` alors que la forme attendue est `/CAB`.
Un raccourci `/CABU` doit réaliser exactement `/CAB update`.

## What Changes

- Définir `.codex/commands/CAB.md` comme implémentation canonique.
- Conserver `cab.md` comme alias transmettant ses arguments ; ajouter `CABU.md`
  comme alias de `update` sans argument supplémentaire.
- Distribuer et vérifier ensemble les trois commandes, sans dupliquer la maintenance.
- Incrémenter la base des composants de 1.10.4 à 1.10.5 avec cachebuster neuf,
  préserver les origines de maintenance déjà admises dont 1.10.4.
- Actualiser spécifications, cadrages et documentation courants, préserver les archives
  et le change actif reconcile-pllm-waiting-policy.

## Capabilities

### Modified Capabilities

Les capacités dont les exigences de version courante sont concernées figurent
au dossier specs ; le protocole et les formats persistés restent identiques.
`codex-integration-distribution` définit les commandes canoniques et les alias.

## Impact

Commandes Markdown, métadonnées de version, constantes des composants et copies
broker, tests de distribution/régression, documentation courante. Aucune nouvelle
dépendance, migration ou installation active. Le repli source conserve la baseline
locale ; la mise à jour de profil utilise préparation complète et restauration des
seuls fichiers de commandes en cas d'échec de publication.

## Autorisation

Périmètre SCM validé le 27 octobre 2026, avec incrément de version demandé.
Le cycle OpenSpec complet, les statistiques d'archive et les étapes Git
conditionnelles de SCM sont inclus. Le change PLLM existant reste intact.
