# Validation SCM — CAB 3.0.1

## Périmètre et décisions
Mandat développeur : correctif public de réconciliation après archivage, cycle
SCM avec CI/CD et changelog du delta depuis 3.0.0. Toutes les modifications
préexistantes suivies et nouvelles non ignorées sont incluses dans la livraison.
Code de lot non attribué : normalisation par ACL ultérieure, non bloquante.
RUN CAB SCM-reconcile-archived-mandate ; session native
01a1c9e3-bed3-7a52-abca-0ea08eaa71d9, mode direct, sans orchestrateur fictif.
Le JSONL natif exact n’est pas exposé ; les compteurs LLM restent indisponibles.

## Tests observés le 12 novembre 2026
- PostgreSQL dédié de fixture : 23 tests réussis, couvrant réconciliation (8),
  configuration (5), projets (4), inventaire agents (3), parents d’atelier (3).
- Parcours public CLI/API/MCP de fixture : substitution, idempotence, conservation
  SID/génération/gel et véritable exécution sandbox après archivage réussis.
  Reçu de fixture : bbdce56553e6610caf3fec416a1b378236aef468aa8359bd94bb455c4d33f603.
- TypeScript et construction Vite : réussis ; avertissements use-client de
  dépendances connus, sans erreur de construction.
- Chromium156.0.8078.79 et Firefox153.6.0 : navigation horizontale, accueil vide,
  cinq sections, secrets masqués, sauvegarde des URLs, préférences persistantes,
  menus au bord gauche et affichage mobile vérifiés.
- Les mêmes navigateurs : configuration POSIX, création et sélection de projets
  par ID et absence de débordement mobile vérifiées.
- Syntaxe Python : 28 fichiers modifiés ou nouveaux contrôlés sans erreur.
- OpenSpec : 27 spécifications canoniques strictes réussies avant synchronisation,
  et change reconcile-archived-direct-mandates valide en strict.

La première recette de création a détecté une course CSRF au chargement initial.
Le client réalise désormais un unique amorçage et utilise le cookie courant ;
les deux campagnes navigateur ont ensuite réussi. Aucun contrôle CSRF désactivé.
Les tests utilisent des données de fixture ; les tests DIU historiques ne sont
ni rejoués ni déclarés réussis par ces contrôles.

## Cohérence documentaire
| Document | État et contrôle |
| --- | --- |
| AGENTS.md | Modification concurrente 0.8 vers1.2 incluse après validation explicite du développeur ; aucune écriture de ce fichier par cette session. |
| CODING_RULES.md | Extension0.1 du socle lue et incluse après validation explicite. |
| PROJECT.md | Réconciliation propriétaire et version de plateforme actualisées. |
| TECHNICAL.md | Transaction, invariants et lien de procédure actualisés. |
| BUILD.md | Livraison DIU3.0.1 ; recette et procédure de construction conservées. |
| DEVOPS.md | Relevé préexistant conservé, outils relus ; aucune régénération par cette session. |
| DEVELOPMENT_MAP.md | Entrée ciblée du change ajoutée, sans reconstruction. |
| openspec/BATCH_CODES.md | Repère provisoire sans allocation de code. |
| README.md | Présentation3.0.1, administration et commande publique actualisées. |
| CHANGELOG.md | Entrée3.0.1 couvrant le delta local complet depuis3.0.0. |
| openspec/specs/system-platform | Delta local conservé, exigences de réconciliation et CSRF dans le change à synchroniser. |

## Livraison et activation
Archivage, rapport SGS, CI/CD DIU, contrôle des publications et du paquet Debian
sont les étapes suivantes. Leur réussite ne se déduit pas des tests source.
Le développeur a validé l’inclusion du socle concurrent. La référence
AGENT_INTEGRATIONS.md du socle reçu est absente ; ce document n’est pas créé
ni ses règles inventées dans ce correctif. Le mandat SCM explicite et le contrat
CAB distribué gouvernent les opérations d’intégration déjà autorisées.
Django check est sans anomalie et makemigrations --check --dry-run ne détecte
aucune migration manquante.
