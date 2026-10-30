# Qualification SCM — CAB 2.1.14

## Autorisation et périmètre

Le développeur valide le correctif du conflit de contextes MCP sous SCM avec incrément, puis CABU et information des sessions. Il demande des sources génériques sans désigner un projet consommateur. Un seul change isolate-shared-mcp-location ; version commune2.1.14. Le codeur direct réalise le travail ; aucune compétence de télémétrie de pilotage invoquée. Aucun correctif de concurrence décision/reminder, recopie de commandes, modèle ou produit consommateur inclus.

## Résultat source et limites

info et découverte MCP sont globaux sans scope implicite. Les lectures info simultanées restent regroupées ; la location est revérifiée et liée au PID. Les contrôles MCP refusent un argument de répertoire divergent avant effet ; leurs appelants internes n’en fournissent plus. Le POST de session cible explicitement sa location. createProbeSession exige un modèle explicite, un broker connecté et deny global dans la location partagée ; toute option élargissant ses permissions/répertoire/agent est refusée. Un serveur remplacé pendant préparation bloque avant création.

La récupération reste explicite, documentée via les routes natives ciblées existantes, sans reconnexion automatique. Aucun journal métier, décision, gate ou once n’est réécrit. L’interface request bas niveau peut toujours initialiser volontairement un contexte : le protocole interdit les sondages arbitraires et réserve son usage à une frontière examinée. Le correctif ne modifie pas le moteur interne de disposition après inactivité d’OpenCode.

## Preuves exécutées

- Client ciblé :33 scénarios ; ensemble affecté client/updater/gestion du moniteur/Web :99/99.
- Global Node :571 tests,543 réussis,28 ignorés conditionnels,0 échec ; durée processus86,315s.
- Python :80/80, sources Python finales inchangées après cette vérification.
- Banc OpenCode2.2.1 privé :1/1, processus8,504s. Sonde depuis client technique hébergée au workspace partagé, deny global, aucun outil ; suppression vérifiée par404, PID serveur et broker conservés.
- Même banc : après déconnexion du broker partagé privé, une session de sonde héritée dans un second workspace initialise un broker concurrent ; partagé failed et concurrent connected sont observés. Disconnect ciblé du concurrent puis connect du partagé donnent concurrent disabled et partagé connected, même PID serveur ; les deux sessions techniques et processus privés sont nettoyés.
- Syntaxe :56JavaScript et16Python ; UTF-8/LF, copies broker identiques. Protocole ORCHESTRATED_CODING.md inchangé, SHA256962ced4a2ded1bdb4d57c90b61ac41f28d7cb1f603ae9a82ac2dfd15cf1277d4.
- OpenSpec avant archive :17/17 standard et strict ; delta ciblé strict valide.

Les fixtures utilisent /workspace/shared, /workspace/technical et /shared-native, sans nom de consommateur. La reproduction native simule la disponibilité initiale perdue par déconnexion explicite du broker privé ; elle ne prétend pas reproduire le minuteur d’inactivité du serveur réel. Les états observés du conflit et de sa récupération sont réels sur ce serveur privé.

Preuves détaillées ignorées par Git : output/scm-mcp-location-isolation/{node-global.log,node-initial-global.log,python-global.log,native-global.log,affected-targeted.log,source-verification.json,openspec-before-standard.log,openspec-before-strict.log}.

Premiers écarts : attente de variante du nouveau test utilisant la mauvaise clé interne, corrigée en reasoning ; deux doubles SDK de maintenance supposaient à tort la transmission du workspace du service, désormais testés avec une location partagée distincte ; lecture info forcée doublée, corrigée par regroupement en vol sans retirer le test de borne ; tentative de connexion native d’un contexte privé encore inexistant404, banc corrigé par création explicite de la session héritée à reproduire. Aucun test désactivé ou garde retirée.

## Matrice documentaire

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Désignation de frontend généralisée à la demande du développeur ; règles et commandes conservées. |
| PROJECT.md | Version2.1.14 et section Isolation des sondes et du broker partagé. |
| TECHNICAL.md | Même section, signature/limites référencées et ancienne désignation de produit généralisée. |
| BUILD.md | Version commune et contrat de distribution/activation ; lien de procédure. |
| DEVOPS.md | Inchangé : fichier généré décrivant l’hôte et les outils observés ; ses identités techniques ne sont pas des exemples de produit. |
| DEVELOPMENT_MAP.md | Seule entrée provisoire du change actualisée, code non attribué ; aucune reconstruction globale. |
| openspec/BATCH_CODES.md | Même entrée ciblée ; attribution ACL ultérieure. |
| README.md | Version source et nouvelle procédure publique d’isolation. |
| CHANGELOG.md | Entrée2.1.14 et désignation antérieure de consommateur généralisée sans changer le fait rapporté. |
| openspec/config.yaml | Inchangé, schéma spec-driven compatible. |
| openspec/specs/ | Trois capacités couvertes : transport V2, statistiques natives, distribution ; quatre exigences ajoutées et une modifiée. |
| Skills/commande CAB | Référence mcp-location-isolation.md et méthodes explicites ; skill statistique renvoie vers la même règle sans changer sa cadence. |
| concurrent-runs.md/ORCHESTRATED_CODING.md/template | Aucune écriture ; concordance du protocole embarqué conservée. |

Les quatre désignations explicites de consommateur relevées dans les contenus courants ont été généralisées. Les identifiants officiels des dépôts de distribution, l’état généré de l’hôte et les preuves historiques ne sont pas réécrits. Aucune désignation nouvelle de consommateur n’est introduite dans ce change.

## Clôture et activation

L’éligibilité à l’archive est établie. L’archive et ses liens, les statistiques six sections, le commit/tag et les publications sont vérifiés séparément. CABU est explicitement autorisé après les sources publiées ; ses preuves d’activation et les notifications sont produites ensuite, sans déduire leur succès de cette qualification source. Aucun RUN réel ni service actif modifié pendant la qualification.

Archivage réellement réussi le30octobre2026 : 2026-10-30-isolate-shared-mcp-location. Après synchronisation : OpenSpec standard16/16, strict16/16 ; cinq blocs delta/spécifications identiques. Liens ciblés vers l’archive et six sections statistiques vérifiés ; aucun BLOCKER(S) à nettoyer. Le code fonctionnel est inchangé depuis les suites globales ; seul le banc natif a ensuite été enrichi et exécuté à nouveau pour reproduire le conflit.
