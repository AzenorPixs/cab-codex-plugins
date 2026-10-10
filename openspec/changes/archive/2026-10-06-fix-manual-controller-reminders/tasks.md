## 1. Spécification

- [x] 1.1 Valider le change ciblé et les spécifications applicables avant le code.

## 2. Correctif

- [x] 2.1 Protéger `notifyOrchestrator()` en mode manuel avant tout appel Codex.
- [x] 2.2 Vérifier les rappels répétés sans RPC Codex, puis la décision HTTP explicite et unique.

## 3. Version et documentation

- [x] 3.1 Aligner les briques versionnées et leurs tests sur `0.86.6`.
- [x] 3.2 Mettre à jour README, TECHNICAL, BUILD et CHANGELOG ; revoir les autres cadrages.

## 4. Validation et clôture

- [x] 4.1 Vérifier la syntaxe, les suites Node/Python, les versions et UTF-8/LF.
- [x] 4.2 Vérifier l'absence de modification des trois changes préexistants et hors périmètre.
- [x] 4.3 Vérifier les validations OpenSpec strict et l'éligibilité de ce seul change à l'archivage.

Après preuve de toutes ces tâches, synchroniser et archiver ce seul change,
puis produire et vérifier son rapport STATISTIQUES.md avant la clôture SCM.

## Preuves

- Change ciblé : `openspec validate fix-manual-controller-reminders --strict`
  réussi avant le code et après l'implémentation.
- Régression ciblée : échec observé sur l'ancien contrôleur (création de
  thread), puis réussite avec la garde manuelle. Deux rappels sans RPC,
  décision HTTP explicite acceptée une fois, doublon et relance terminale refusés.
- Suite Node : 23 tests réussis. Suite Python : 37 tests réussis.
- `node --check` : contrôleur, superviseur et deux fichiers de tests valides.
  `python3 -m py_compile` : broker et deux fichiers de tests valides.
- Audit : 14 fichiers existants modifiés, six artefacts du change créés,
  UTF-8/LF conformes ; six versions de base `0.86.6`, JSON et TOML valides.
  Empreintes des trois changes préexistants inchangées.
- Validation canonique standard : sept spécifications valides, sans erreur
  normative. La validation globale stricte échoue sur 13 avertissements de
  longueur préexistants dans six spécifications ; limite signalée, sans
  réécriture hors périmètre ni annonce de réussite stricte globale.

## Revue documentaire

| Document | État et preuve |
|---|---|
| AGENTS.md | Inchangé : règles de sécurité et statistiques conservées ; empreinte identique. |
| PROJECT.md | Inchangé : §§ 3.2–3.4, 5.2 et 5.4 cohérents avec la décision principale, la corrélation et le rapport d'archive. |
| TECHNICAL.md | Mis à jour : §§ 3, 9 et 15, version commune et séparation des rappels manuels/automatiques. |
| BUILD.md | Mis à jour : § 7, version de base commune `0.86.6` ; aucun mode de distribution ajouté. |
| DEVOPS.md | Inchangé : runtimes Python/Node/OpenSpec déclarés employés ; aucune dépendance ajoutée. |
| README.md | Mis à jour : mode manuel documenté et distribution courante `0.86.6`. |
| CHANGELOG.md | Mis à jour : entrée Unreleased du correctif, de ses tests et de l'incrément commun. |
| openspec/specs/ | Deux deltas ciblés validés ; synchronisation par archivage autorisée. Autres contrats conservés. |

## Limites

Aucun effet Git, déploiement utilisateur, mise à jour du cache Codex ou test
sur les services personnels n'est réalisé. Le test HTTP contrôlé et les
tests MCP isolés constituent les preuves d'intégration de cette correction.
Les avertissements OpenSpec globaux préexistants restent signalés.
