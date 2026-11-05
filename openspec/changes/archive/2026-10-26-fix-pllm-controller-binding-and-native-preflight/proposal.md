# MOD03 — Raccord PLLM, fournisseur natif et variante OpenCode

## Why
Le contrôleur peut être préparé sans chemin de catalogue public, compare littéralement opencodego à opencode-go et attend uniquement la variante historique du parent. Ces écarts empêchent l'armement automatique malgré une sélection et un prévol natifs valides.

## What Changes
- Préparer et vérifier le chemin public du skill actif, produire un patch de configuration non secret et le transmettre effectivement au contrôleur lors du démarrage autorisé ; préserver les options explicites.
- Rapprocher le seul alias connu opencodego vers le natif opencode-go après contrôle d'unicité, connexion et modèle exact ; conserver les identités logiques/natives et le digest du catalogue.
- Accepter les variantes parent.model.variant et parent.variant historiques, exiger leur cohérence et celle de assistant.variant lorsqu'il est présent, pour prévol et indisponibilité.
- Qualifier la distribution complète 1.10.3 et la transition depuis 1.10.2. Préparer un paquet reproductible et archiver ce seul change avec rapport.

## Capabilities
### Modified Capabilities
- coding-model-policy : préparation du catalogue, rapprochement natif et variantes corrélées.
- codex-integration-distribution : jeu cohérent 1.10.3 et outil de préparation distribué.
- active-component-update : origine chargée 1.10.2 qualifiée sans changement des gardes.

## Impact
model-policy.mjs, controller.mjs, nouvel outil prepare-model-policy.mjs sans effet, commande /cab, tests unitaires/HTTP/distribution et banc deux UID. Versions courantes, modules Python/Node, copies broker, manifeste et supports alignés en 1.10.3 ; archives antérieures inchangées. Documentation PROJECT/TECHNICAL/BUILD/README/CHANGELOG et références CAB mises à jour. La copie ORCHESTRATED_CODING.md est exclue : seul son référentiel template peut être corrigé selon l’instruction humaine ultérieure. Aucune dépendance, configuration active, source Pixs, génération réelle, quota, Git, installation, cache ou service partagé modifié.

Autorisation humaine vérifiée : chat 1CISMP8, message 01a175d3-4b43-75c3-9cca-12c2de6dc17c. Le mandat de phase 1 autorise explicitement ces sources, artefacts OpenSpec, tests, paquet et archivage. Publication par le développeur ; activation uniquement après preuves de publication et PAUSE transmises par le parent.

La régression de distribution révèle trois écarts documentaires antérieurs au baseline dans ORCHESTRATED_CODING.md : bootstrap absent, références d'étapes absentes et ancien bloc concurrent CAB1.0.0. Le développeur exige leur correction uniquement dans le projet template. La copie CAB est rétablie exactement au baseline ; ces échecs documentaires hors périmètre restent signalés sans désactivation de tests. Aucun fichier template n'est modifié par ce change CAB.
