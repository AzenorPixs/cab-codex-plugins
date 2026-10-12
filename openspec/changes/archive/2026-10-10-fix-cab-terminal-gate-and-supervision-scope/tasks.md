## 1. Spécification

- [x] 1.1 Rédiger et valider en strict le contrat approuvé avant code ou tests.

## 2. Reproductions et corrections

- [x] 2.1 Reproduire puis corriger le gate avec une validation manuelle indécise.
- [x] 2.2 Reproduire puis corriger la compatibilité base et /status des deux clients.
- [x] 2.3 Reproduire puis corriger la corrélation d'activité SSE à la session du job.

## 3. Documentation et validation

- [x] 3.1 Actualiser TECHNICAL.md, README.md et CHANGELOG.md ; revoir la matrice.
- [x] 3.2 Exécuter syntaxe, suites ciblées et globales, OpenSpec et contrôles de périmètre.

## 4. Clôture après acceptation

L'archivage de ce seul change avec synchronisation et la production de son
STATISTIQUES.md sont deux opérations distinctes, à prouver après réalisation.
Les tâches d'acceptation ci-dessus ne les anticipent pas. Le rapport doit
posséder six sections, UTF-8/LF et des totaux recoupés, sans skill de pilotage.

## Preuves avant archivage

- Contrat approuvé par le développeur, avec coexistence du seul correctif
  avec les trois changes historiques et archivage final inclus.
- Validation OpenSpec du change en strict avant code/tests et après
  corrections : exit 0, aucun diagnostic.
- Reproductions hors sandbox : 8/8 en échec sur les sources initiales,
  correspondant au gate 201 au lieu de 409, aux routes d'URL erronées et à
  l'actualisation de l'activité par du trafic SSE étranger.
- Les premiers essais sandbox ont échoué sur listen EPERM : ils ne constituent
  pas des reproductions fonctionnelles. Les 16 répertoires temporaires laissés
  avant l'installation des callbacks ont été nettoyés après contrôle borné
  de propriété et de signature ; aucun répertoire inconnu n'a été supprimé.
- Après correction : 8/8 reproductions réussies ; suite Node complète 52/52,
  suite Python complète 38/38. Les 8 reproductions sont incluses dans les 52,
  pas additionnées au total final de 90 tests.
- Trois scripts Node contrôlés par node --check, exit 0 chacun. Node et Python
  utilisent les chemins explicites de DEVOPS.md ; tests HTTP et systemctl
  simulés, aucun composant réel installé, démarré ou arrêté.
- Avant synchronisation : strict global exit 1, 13 WARNING et zéro ERROR,
  identiques à l'état CGP. Ce contrôle n'est pas présenté comme réussi.
- UTF-8/LF et fin de ligne contrôlés sur 15 fichiers préparés. Empreintes :
  huit fichiers existants modifiés, sept nouveaux, aucun fichier supprimé ;
  les trois changes historiques et les archives antérieures sont inchangés.

## Matrice documentaire du correctif

| Élément | État et justification |
| --- | --- |
| Projet réel | Trois scripts corrigés, reproductions puis 90 tests finaux réussis ; intégration réelle non exécutée |
| AGENTS.md | Inchangé, sections 5 à 7 : validation explicite, change avant code, SCM direct et rapport d'archive respectés |
| PROJECT.md | Inchangé, section 5 : responsabilités du broker, du contrôleur et de la supervision conservées |
| TECHNICAL.md | Sections 7 et 15 actualisées : demandes locales indécises, activité corrélée et URL commune |
| BUILD.md | Inchangé, sections 4 et 11 : mêmes runtimes, dépendances, distribution et séparation des contrôles d'intégration |
| DEVOPS.md | Inchangé : interpréteurs déclarés utilisés, aucune installation ni modification d'environnement |
| README.md | Contrôleur et supervision actualisés : URL base ou /status, gate et activité ciblée |
| CHANGELOG.md | Entrée Unreleased dédiée aux trois risques, sans nouvelle release ni incrément de version |
| openspec/specs/ | controller-transport et persistent-job-supervision synchronisées par l'archivage autorisé ; validation globale sans strict 7/7 |
| ORCHESTRATED_CODING.md | Inchangé : mêmes décisions unitaires, gel et clôture ; aucune session pilotée déclenchée |

## Preuves après archivage

- Archivage unique par openspec archive avec --yes --json, exit 0 :
  2026-10-10-fix-cab-terminal-gate-and-supervision-scope, specsUpdated true,
  deux exigences ajoutées, une modifiée, aucune supprimée ni renommée.
- Strict global après synchronisation : exit 1, 13 WARNING, zéro ERROR.
  Les tuples capacité/niveau/chemin/message sont exactement identiques au
  relevé initial de cette session ; aucun nouveau diagnostic du correctif.
- Global sans strict : exit 0, 7/7 valides. Les 13 avertissements restent
  explicitement signalés ; le strict global n'est pas présenté comme réussi.
- Aucun code ou test n'a changé depuis les 52/52 Node et 38/38 Python.
  Aucune intégration réelle, opération Git, installation ni publication.
- STATISTIQUES.md est produit et vérifié après archivage, sans réarchivage :
  six sections de niveau 2, UTF-8/LF, 18 chemins distincts et totaux recoupés
  avec les sorties natives (90 tests finaux ; journal partiel de 18 commandes,
  13 exit 0 et cinq sorties non nulles qualifiées). Quotas, tokens, coûts et
  sondes restent N/A motivés en SCM direct.
  SHA-256 : d3143963877c3964aa397c9beec4b3b8203ce3fdc6c048749563f98df0efcf68.
- Contrôle structurel post-archive : les trois exigences ciblées correspondent
  aux deux spécifications de référence et le change actif n'existe plus.
