# Validation SCM — 11 novembre 2026

## Périmètre et décisions
Mandat développeur du chat 01a1c9e3-bed3-7a52-abca-0ea08eaa71d9 : autonomie dans
le change, revue finale, quatre exceptions et décisions nécessaires tranchées
entre développeur et orchestrateur avant codage. Livraison CI/CD et CABU autorisés.
Version cible : 2.6.0. Aucun code de lot attribué ; référentiel prompts non modifié.

## Contrôles réussis
- 81 tests ciblés Node : autonomie, client V2, politique native et efficacité.
- 273 tests Python (unittest discover), après correction de fixtures devenues
  obsolètes : versions attendues résolues depuis la brique et argument reconstructed
  relayé par les doubles de réconciliation. Les assertions métier sont conservées.
- 7 tests HTTP ciblés contrôleur : corrélation Code Mode, broker MCP parallèle,
  refus des historiques divergents et réservations inutilisées.
- 6 tests de distribution : version, empreintes, liens et budgets des routeurs.
- 3 tests atelier, y compris deux UID réels (1000/1002).
- Recette OpenCode 2.2.7 réel, fournisseur synthétique local : un mandat initial,
  deux essais échoués, correction et test réussi, une soumission, une revue finale
  et publication CAB. Zéro décision intermédiaire observée. Il s’agit d’une preuve
  de transport/exécution ; elle ne qualifie pas la planification d’un modèle réel
  ni tous les bancs externes. Les commandes utilisent bwrap, pas un shell hôte libre.
- Syntaxe Python/JavaScript, JSON, UTF-8/LF, git diff --check et OpenSpec strict.

## Limites historiques vérifiées
La campagne Node élargie initiale a exécuté 1674 tests : 1569 réussis, 72 échecs,
33 ignorés. Des exécutions concurrentes de campagnes et la distribution en cours
ont affecté cette première observation ; elle n’est pas présentée comme verte.
Les quatre cas de contrôleur concernés ont été rejoués : 7 tests réussis.
La distribution finale a également été rejouée avec succès.

Les six fichiers conservant des échecs ont été rejoués séparément sur les sources
courantes et sur le commit de départ b2033eae : 143 tests dans chaque campagne,
77 réussis/66 échecs courants, 75 réussis/68 échecs au départ. Aucun nouvel intitulé
d’échec courant. Causes : fixtures de versions, prévols historiques, jeux de fichiers
incomplets et attentes multipart/dépendances déjà divergentes. Comparaison détaillée
non versionnée : output/scm/autonomy-20261111/baseline-comparison.json.
La recette native historique complète échoue à la collecte de télémétrie usage ;
le même timeout est reproduit sur b2033eae. Le nouveau parcours autonome ciblé
passe séparément. Aucun de ces échecs n’est masqué ou déclaré réussi.
Les corrections fonctionnelles de ces écarts historiques restent hors mandat.

## Cohérence documentaire
PROJECT.md, TECHNICAL.md, BUILD.md, README.md, CHANGELOG.md, AGENTS.md et
DEVELOPMENT_MAP.md décrivent la nouvelle branche ; DEVOPS.md préexistant est conservé.
Le contrat distribué et son bundle sont régénérés ; profils historiques conservés.
La collecte passive et le flux SSE remplacent les réveils périodiques du pilote.
Les autorisations natives et les limitations d’accès externe restent explicites.

## Livraison
La qualification source est acquise dans les limites ci-dessus. Publication DIU,
activation CABU et reprise Pixs sont vérifiées séparément après archivage ; ce
rapport ne prétend pas les avoir réalisées avant leur observation.
