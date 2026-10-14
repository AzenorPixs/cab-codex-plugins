## 1. Coordination et isolation
- [x] 1.1 Implémenter et tester le registre durable et les réservations atomiques.
- [x] 1.2 Isoler les contrats, décisions, permissions, gates et récupérations.
- [x] 1.3 Exposer les vues broker et superviseur par RUN.
- [x] 1.4 Protéger purge, arrêt, ressources et intégration partagée.

## 2. Protocole et distribution
- [x] 2.1 Adapter commande, skills, scripts distribués et documentation.
- [x] 2.2 Mettre à jour tous les prompts pilotés et protocoles des huit projets.
- [x] 2.3 Vérifier que CISM, CAISM et les prompts directs sont inchangés.
- [x] 2.4 Synchroniser la version 1.0.0 sans déployer.

## 3. Vérifications et clôture
- [x] 3.1 Exécuter syntaxe, tests ciblés, intégration isolée et régressions.
- [x] 3.2 Vérifier cohérence documentaire et OpenSpec strict.


## Preuves de vérification

Dernière passe : 155 tests réussis, soit 48 Python et 107 Node, dont un
contrôle OpenCode natif isolé. Les répétitions et échecs intermédiaires ne
sont pas additionnés à ces 155 tests distincts.

| Commande | Tests | Résultat |
|---|---:|---|
| `node tests/concurrent-run-registry.test.mjs` | 11 | Réussie |
| `node tests/concurrent-controller.test.mjs` | 8 | Réussie |
| `node tests/concurrent-supervisor.test.mjs` | 1 | Réussie |
| `node tests/controller-configuration.test.mjs` | 13 | Réussie |
| `node tests/controller-job-restoration.test.mjs` | 27 | Réussie |
| `node tests/controller-healthcheck-compatibility.test.mjs` | 6 | Réussie |
| `node tests/controller-service-distribution.test.mjs` | 13 | Réussie |
| `node tests/controller-session-recovery.test.mjs` | 16 | Réussie |
| `node tests/persistent-job-supervisor.test.mjs` | 11 | Réussie |
| `python3 -m unittest discover -s tests -p 'test_*.py'` | 48 | Réussie |
| `CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode node tests/native-opencode.test.mjs` | 1 | Réussie |

Syntaxe : python3 -m py_compile sur les dix fichiers Python modifiés et
node --check sur les sept modules JavaScript distribués, réussis.
OpenSpec global strict avant synchronisation : 8/8, aucun échec.
Mise à jour des prompts en revue seule : aucune modification proposée
après application, démontrant l'idempotence sur les huit projets.

Le contrôle natif utilise OpenCode 1.19.0, trois sessions API distinctes
et un seul broker source 1.0.0. Aucun appel de modèle ni fournisseur.
Les jobs synthétiques sont désarmés/libérés puis le broker et OpenCode
temporaires sont fermés ; la disparition du PID du broker est vérifiée.

Le contrôle indépendant par empreintes couvre 96 fichiers PROMPTS
préservés, dont les seize CISM/CAISM et les huit INDEX. Aucun prompt direct
n'est modifié. Hors OpenSpec : 100 fichiers existants modifiés et seize
fichiers créés (douze sources/tests/référence CAB et quatre protocoles).
Tous les fichiers de ce périmètre passent UTF-8/LF et le contrôle des
motifs de credentials. Aucune inspection Git, installation de profil,
activation de service ou écriture de configuration OpenCode utilisateur.

## Matrice de cohérence documentaire

| Élément | État et preuve |
|---|---|
| Projet réel | Sources 1.0.0, tests ci-dessus et contrôle natif isolé. Profil à un contexte partagé, intégration à jalon stable. |
| AGENTS.md | Inchangé, empreinte initiale conservée ; autorisations explicites du développeur et exclusions respectées. |
| PROJECT.md | Mis à jour : architecture et section Pilotage concurrent 1.0.0, rôle neutre et propriétaires RUN. |
| TECHNICAL.md | Mis à jour : modules, registre, routes, générations, barrière stable et réconciliation de référence. |
| BUILD.md | Mis à jour : jeu de modules indissociables, installation sans activation et repli contrôlé. |
| DEVOPS.md | Inchangé, empreinte conservée : inventaire réel Debian 13, Node 24, Python et OpenCode 1.19.0 ; aucun nouvel outil tiers. |
| README.md | Mis à jour : version source et usage de plusieurs sessions CISMP dans le contexte commun. |
| CHANGELOG.md | Entrée 1.0.0 du 2026-10-13, comportements, compatibilité, limites et absence de déploiement. |
| openspec/specs/ | Huit capacités synchronisées ; validation stricte finale 8/8 après correction du Purpose généré et déplacement sans changement de comportement d’une clause longue vers son scénario. |
| Protocoles et prompts | 72 prompts pilotés, huit protocoles dont quatre créés ; prompts directs inchangés et blocs de mise à jour idempotents. |
| Plugin, commande, skills | Version 1.0.0 de base, contrat concurrent et API ready/reconcile ; tests de distribution réussis. |

## Contrôles postérieurs d'archivage et rapport

Ces opérations de clôture restent obligatoires et sont suivies après leurs
effets ; elles ne sont pas pré-cochées comme tâches d'implémentation.

- Archivage et synchronisation de ce seul change : RÉUSSIS, CLI exit 0 le 2026-10-13, archive 2026-10-13-add-concurrent-cismp-runs ; 15 exigences ajoutées et 6 modifiées, aucune supprimée.
- STATISTIQUES.md : PUBLIÉ après archive ; six sections, UTF-8/LF et totaux VÉRIFIÉS par contrôle final : 136 chemins, 155 tests, 96 fichiers PROMPTS hors sélection préservés.
- Validation stricte finale des références : RÉUSSIE, 8/8 après synchronisation ; aucun réarchivage.

Le rapport donne le manifeste final de 136 chemins (107 existants modifiés,
29 nouveaux par rapport au relevé initial). Le périmètre source/protocoles
hors OpenSpec reste 116 chemins ; OpenSpec compte huit références et douze
artefacts d'archive, rapport compris. La dernière passe reste 155 tests,
sans addition des répétitions. L'archivage a émis un conseil non bloquant
sur le nombre de deltas ; les deux écarts documentaires post-fusion ont été
corrigés et la validation stricte finale est réussie.

GATE_TERMINAL_SCM=VALIDÉ. Rapport présent et vérifié ; objectif source TERMINÉ.
