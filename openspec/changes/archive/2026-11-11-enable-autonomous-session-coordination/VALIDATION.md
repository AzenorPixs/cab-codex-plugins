# Validation source 2.7.0 — 11 novembre 2026

## Mandat et choix

Mandat SCM validé : coordination intersessions autonome, transfert explicite des
profils existants, transports natifs et IPC inter-UID, revue finale obligatoire.
Extension expressément approuvée : exécuteur externe générique SSH sur banc réservé.
Publication DIU puis CABU autorisées ; versions cible CAB2.7.0 et prompts1.0.19.
Amendements de la session CCAB inclus, empreintes conservées.

## Contrôles observés

| Contrôle | Résultat | Preuve locale |
|---|---|---|
| Python, suite complète sur copie isolée avec payload src2.7 | 291 réussis | output/scm/coordination-20261111/coordination-final-270-python.txt |
| Autonomie, coordination, ressources, exécution externe et client natif | 169 réussis | output/scm/coordination-20261111/coordination-runtime-270-final.txt |
| CABU, déploiement et reprises du paquet complet | 127 réussis | output/scm/coordination-20261111/coordination-update-270-final.txt |
| OpenCode2.2.7 réel, broker UID1002 / contrôleur UID1000, SSH réel en Docker dédié | réussi, zéro décision intermédiaire | output/scm/coordination-20261111/external-real-ssh.txt |
| Moniteur Chromium et Firefox headless, desktop et mobile | réussi | output/scm/coordination-20261111/coordination-browser.txt |
| Syntaxe fichiers modifiés | 34 Python, 91 modules JS, 7 JSON réussis avant archivage | contrôle local du 11 novembre |
| OpenSpec strict | réussi avant archivage | openspec validate enable-autonomous-session-coordination --strict --no-interactive |
| Amendements CCAB | SHA256 inchangés sur les deux contenus reçus | tmp/coordination-ccab-amendments.json |

Les campagnes se recouvrent : ces effectifs ne sont pas additionnés en un total
exhaustif. Les premières recettes ont révélé une clé Docker de fixture incorrecte
et le plafond128 du journal CABU ; les corrections ont été validées par les
campagnes finales ci-dessus. La limite du journal est256 ; les gardes de chemins,
empreintes et permissions restent inchangées.

Le scénario SSH vérifie copie d’artefact, commande réelle, reçu stable via status,
nettoyage puis vérification avant restitution, résolution du reçu par requestId
et acceptation finale. La coordination native vérifie publication producteur,
notification directe au codeur consommateur, lecture et acquittement. Ces recettes
sont isolées ; elles ne prouvent pas les tests métier Pixs sur son LXC013.

## Cohérence documentaire

| Document | État et référence vérifiée |
|---|---|
| AGENTS.md | inchangé, sections6–7 compatibles avec mandat autonome et contrat distribué |
| PROJECT.md | mis à jour, Coordination et bancs autonomes CAB2.7.0 |
| TECHNICAL.md | mis à jour, même section et références spécialisées |
| BUILD.md | mis à jour, distribution et qualification distinctes de l’activation |
| DEVOPS.md | inchangé, outils et bancs de test autorisés utilisés |
| DEVELOPMENT_MAP.md | amendement ciblé du change, code non attribué |
| README.md | mis à jour, entrée de navigation autonomie2.7 |
| CHANGELOG.md | entrée2.7.0 complétée coordination et exécution externe |
| OpenSpec | exigences coordination, autonomie et nouvelle capacité external-test-execution |
| Contrat distribué | références coder-coordination et external-execution, paquet public régénéré85documents |

## Livraison et activation

À ce jalon, la source est qualifiée ; CI/CD et CABU restent à constater séparément.
Le reçu de pause Pixs conserve SID/RUN/job/mandat/r23 et bail013 HELD, sans permission
native ni opération active. Les preuves de publication et activation sont conservées
dans output/scm/coordination-20261111/, hors Git. La qualification métier Pixs
et la clôture de l’incident CCAB appartiennent au pilote Pixs après activation.
