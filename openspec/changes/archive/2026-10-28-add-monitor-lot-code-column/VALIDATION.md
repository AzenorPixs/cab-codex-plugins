# Validation SCM — Codes de lot CAB 2.1.2

## Périmètre et comportement
Colonne « codes de lot » en deuxième position des tableaux RUN et CHANGE. Code extrait uniquement du premier titre explicite de proposal.md hors code ; valeur vide sans code ou source admissible. Le RUN utilise son change corrélé, actif ou archivé référencé. Tri, recherche, compteurs et actions préservés. Aucune installation active, dépendance ou migration. Périmètre documentaire et technique approuvé avant écriture.

## Contrôles exécutés
- `node --test tests/web-monitor.test.mjs tests/controller-service-distribution.test.mjs` : 42 succès, zéro échec.
- `node --test tests/*.test.mjs` : 458 déclarés, 432 succès, zéro échec, 26 non exécutés. Profils historiques optionnels nécessitant le paquet/processus original et scénario OpenCode natif isolé optionnel ; leurs preuves ne sont pas revendiquées.
- `python3 -B -m unittest discover -s tests -p 'test_*.py'` : 73 succès, zéro échec.
- `node tests/web-monitor-browser.mjs` : qualification complète réussie dans Chromium 156.0.8078.47 et Firefox 153.5.1, 1440 × 1100 et 390 × 844. Présence de PA01/O26 et cellule vide contrôlées dans chaque tableau ; compteurs, tri, filtres, sélection, fraîcheur, SSE et gestion simulée conservés. Aucun service utilisateur réel appelé.
- `node --check` : 34 fichiers réussis ; `py_compile.compile(..., doraise=True)` : 11 fichiers réussis avec sortie locale contrôlée ; 66 sources/supports UTF-8/LF conformes. Trois copies broker src/distribution identiques.
- `openspec validate add-monitor-lot-code-column --strict` : réussi avant code.
- `openspec validate --all --strict` : 16 éléments valides, zéro échec avant archive.

Les artefacts temporaires des bancs sont isolés ; sessions navigateur et serveurs de fixture fermés par les finally des tests. Les copies Python compilées sont régénérables. Les secrets des installations réelles ne sont pas lus pour ces tests.

Lecture ciblée supplémentaire, sans écriture dans Pixs : parseChangeTitle reconnaît les cinq titres réels PA01, PA02, C08, O26 et B02 des proposals correspondantes. Ces cinq assertions ne sont pas ajoutées au total des suites globales.

## Corrections de qualification
Les attentes regex de distribution sont alignées de 2.1.1 à 2.1.2. Le banc navigateur a d'abord échoué après les assertions des codes de lot sur l'état du broker : sa fixture V2 omettait /api/location, désormais consulté par le client existant pour la localisation MCP partagée. Ajout de cette seule réponse synthétique ; aucune attente fonctionnelle affaiblie. Qualification complète rejouée et réussie. L'admission de la version broker déjà qualifiée 2.1.1 est conservée dans la liste fermée avec sa vérification.

## Cohérence documentaire
| Document | État et preuve |
| --- | --- |
| Projet réel | Collecteur readChanges/parseChangeTitle et renderWork alignés ; preuves ci-dessus. |
| AGENTS.md | Inchangé : règles de session directe, autorisations et validation applicables ; aucun changement de gouvernance. |
| PROJECT.md | Mis à jour : §1, version de référence 2.1.2 ; architecture inchangée. |
| TECHNICAL.md | Mis à jour : §3 version source et section « Codes de lot dans le moniteur ». |
| BUILD.md | Mis à jour : distribution courante 2.1.2 ; même packaging et aucune installation. |
| DEVOPS.md | Inchangé : inventaire d'environnement, chemins Node/Python/OpenSpec et navigateurs utilisés ; aucune dépendance ajoutée. |
| README.md | Mis à jour : version courante et section « Codes de lot dans le moniteur ». |
| CHANGELOG.md | Mis à jour : entrée 2.1.2 ; entrées historiques conservées. |
| openspec/specs | Deux exigences local-web-monitor et le scénario de distribution 2.1.2 synchronisés par archivage réussi le 28 octobre 2026. |

Les autres supports de version courants sont inventoriés dans INVENTAIRE-SCM.json. Aucun cadrage historique, archive ni preuve runtime antérieure réécrit. Aucun écart hors périmètre constaté dans cette revue ciblée.

## Limites et clôture
La qualification porte sur les sources et les fixtures locales. Aucune preuve de déploiement actif ni de mise à jour du plugin installé n'est déduite. Archivage, rapport à six sections, puis commit et publications conditionnelles SCM restent des étapes distinctes ; leurs résultats réels sont restitués après exécution. Pas de bilan BLOCKER/BLOCKERS à nettoyer dans ce change.

Archivage vérifié : dossier actif absent, archive présente, cinq tâches cochées, canons mis à jour. STATISTIQUES.md : six sections UTF-8/LF et totaux vérifiés. Aucun bilan de blocage présent.

## Contrôle de clôture Git

À l'étape de commit, la liste des chemins Git contient aussi des modifications dans deux archives étrangères au lot : `2026-10-28-align-uppercase-cab-identities-2-1-1` et `2026-10-28-fix-runtime-recovery-and-fast-cabu-update`. Ces chemins ne figurent pas dans les écritures de cette session. Aucun contenu de diff Git n'est consulté ; aucune modification étrangère n'est annulée ou indexée. La décision de périmètre du commit est demandée avant `git add .`. Le résultat du commit et des publications reste en attente, sans remise en cause de la qualification source ou de l'archivage réalisé.

Décision de clôture Git : inclusion explicite de toutes les modifications du dépôt, y compris les deux anciennes archives, dans le commit SCM complet. La comparaison des empreintes confirme les sources qualifiées ; aucun rejeu de test ou archivage nécessaire. Les modifications étrangères sont incluses sans nouvelle analyse de leur contenu, conformément à la règle SCM de contrôle des chemins seulement.
