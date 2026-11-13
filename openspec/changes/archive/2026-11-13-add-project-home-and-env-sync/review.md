# Validation — 13 novembre 2026

SCM direct, RUN SCM-project-home-20261113, session
01a1d598-a0d2-7e00-af93-52546171fc85. Périmètre autonome validé dans ce chat.

## Résultats
- 8 tests de lecture publique : littéraux, types, forges, doublons, export,
  substitutions non exécutées, URL avec secrets, liens, FIFO, taille et UTF-8.
- 5 tests PostgreSQL/inotify réels dans cab-300-package-test : révisions,
  idempotence, suppression, accès refusé avant lecture, shape non détournable,
  droits SQL, publication, remplacement atomique et recréation.
- 13 tests de non-régression réussis : catalogue4, statistiques7, identifiants2.
- Nouvelle migration appliquée sur base existante ; makemigrations --check
  ne trouve aucun delta. Le premier essai a révélé le propriétaire distinct
  de la publication ; sa maintenance appartient maintenant à l’installateur.
- Installation neuve dans cab-home-bootstrap-test : aucun cluster CAB avant
  le Web, bootstrap authentifié réussi, migrations et shape Electric réelles,
  projects privé illisible par le compte Electric, version3.2.0.
- TypeScript/Vite réussis, avertissements de directives React amont conservés.
  Compilation des fichiers Python modifiés réussie ; git diff --check réussi.
- Chromium156.0.8078.79 et Firefox153.7.0 réels : maison, arrivée projet,
  route Sessions, redirection canonique, cartes, retrait de variables, édition
  atomique externe, suppression/recréation et absence de débordement mobile.
  Affichage depuis le catalogue :7ms/9ms avec POST de relecture retardé8s.
  Ce sont des mesures du banc, pas une garantie de latence en production.
- Le premier essai Electric a exigé REPLICA IDENTITY FULL ; une projection
  dédiée ne contenant que id et public_metadata assure cette compatibilité.
  projects reste le stockage maître du dernier instantané public du fichier.
- Contrôle visuel des captures desktop réussi ; les secrets synthétiques et
  la configuration privée ne figurent ni dans les cartes ni dans la shape.

Preuves non versionnées : output/scm/cab-3.0.0/project-home-browser-proof.json,
project-home-bootstrap-proof.json, project-home-build.log et captures du banc.
Les commandes de tests sont tests/test_project_metadata.py,
tests/test_project_metadata_domain.py, tests/project-home-browser.mjs et
tests/project-home-bootstrap.py ; les trois dernières nécessitent le banc
explicitement réservé, jamais un projet utilisateur.

## Cohérence documentaire
| Document | État et justification |
| --- | --- |
| AGENTS.md / CODING_RULES.md | Inchangés : règles existantes appliquées, aucun nouveau langage ou outil. |
| PROJECT.md | Accueil et instantané immédiat ajoutés, version cible actualisée. |
| TECHNICAL.md | Transaction et projection publique dédiée documentées. |
| BUILD.md | Migration0011, publication par installateur et retour arrière décrits. |
| DEVOPS.md | Inchangé : outils prescrits employés, aucune régénération. |
| DEVELOPMENT_MAP.md | Entrée ciblée provisoire, sans attribution de code. |
| openspec/BATCH_CODES.md | Entrée provisoire séparée ; attribution ACL ultérieure. |
| README.md | Maison, /sessions et actualisation différée documentées. |
| CHANGELOG.md | Entrée Unreleased consacrée à l’évolution. |
| docs/platform-operations.md | Variables autorisées, états d’erreur et surveillance décrits. |
| OpenSpec system-platform | Delta strict validé avant archivage ; aucune autre évolution active modifiée. |
| AGENT_INTEGRATIONS.md | Référence préexistante absente ; aucune configuration ou intégration d’agent modifiée. |

## Périmètre et livraison
Version source cible3.2.0, version initiale vérifiée3.1.4. Pas de dépendance
ajoutée ni de changement direct de project.env. Les paramètres Git nécessaires
à DIU sont présents ; seule DIU modifiera indirectement PROJECT_VERSION.
L’inventaire inclut intégralement les travaux de cette session et les deux
modifications statistiques préexistantes approuvées. La préparation des
payloads publics est réussie. L’archivage, les rapports CAB et la livraison
DIU sont vérifiés séparément après cette validation des sources.
L’activation du service installé n’est pas déduite de la présence d’un paquet.
