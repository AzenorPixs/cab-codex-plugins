# Qualification source SCM — CAB 1.8.0

Le périmètre humain validé couvre les deux changes source
fix-orphaned-validation-admission (L1) et
support-frozen-recovery-controller-maintenance (L2), leur qualification et
leur archivage. La cible SemVer demandée est 1.8.0. L'extension explicite
ajoute les installations par releases à liens relatifs et le diagnostic
filtré des métadonnées PENDING. Aucune installation ou réparation vivante,
reconnexion MCP réelle, intervention Pixs ou opération Git n'est réalisée.

SCM est exécuté directement par Codex. Les essais locaux de processus ne
constituent pas un pilotage du chat C08. Aucun sous-agent ou skill de
statistiques pilotées n'est lancé. Les contrats et le code sont génériques ;
les identifiants C08 sont confinés à l'annexe opérationnelle et aux preuves
historiques de la demande.

## Validation réellement exécutée

Preuves locales régénérables sous .cab-scm-1.8.0-work, hors livraison Git :

| Contrôle | État et résultat | Preuve |
| --- | --- | --- |
| Suite Node finale | Exécutée et réussie : 363 réussis, 0 échec, 1 ignoré, 364 cas | node-release.txt |
| Python unittest final | Exécutée et réussie : 72/72 | python-release.txt |
| Syntaxe des fichiers source/tests concernés | Exécutée et réussie : 40/40 | source-final.json |
| Copies broker distribuées | Exécutée et réussie : 3 identiques octet pour octet à src/ | source-final.json |
| Gardes retry/prévol/ASK/once | Exécutée et réussie : 5 corps identiques à l'original 1.7.1 | source-final.json |
| Chromium et Firefox | Exécutée et réussie sur la distribution 1.8.0 ; seul le lancement par lien du moniteur a ensuite changé, sans modification visuelle | browser-tests.txt |
| OpenSpec strict global avant archive | Exécutée et réussie : 15/15, dont 13 specs et 2 changes | openspec-release-before-archive.json |

Total unitaire distinct partagé par les deux changes : 435 réussis, aucun
échec, 1 ignoré sur 436 cas. Les 28 scénarios bootstrap de la suite Node
finale, les 3 tests de projection et les répétitions ciblées sont inclus,
pas additionnés. La trace bootstrap-final.txt contient la répétition
précédente 27/27 ; le 28e scénario de divergence layout CLI est inclus dans
la suite finale complète. Le scénario ignoré nécessite CAB_TEST_OPENCODE et
une instance native produit : non exécuté, hors qualification isolée.

Commandes principales, exécutées une par une :

```text
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
node --check <fichier.mjs>
python3 -m py_compile <fichier.py>
node tests/web-monitor-browser.mjs
openspec validate --all --strict --json
```

Node : /home/devops/node/current/bin/node ; Python :
/home/devops/python/current/bin/python3 ; OpenSpec :
/home/devops/.local/npm/bin/openspec. CAB_TEST_ORIGINAL_PLUGIN désigne le
cache original 1.7.1 épinglé ; TMPDIR et PYTHONPYCACHEPREFIX sont sous la
racine CAB. Lint, typage et construction tiers : non disponibles, aucune
chaîne distincte configurée pour ce périmètre. ShellCheck : non pertinent,
aucun script shell modifié. Aucun résultat n'est emprunté au runtime produit.

## Critères et preuves fonctionnelles

- L1 admet seulement après les gardes natives et persiste owner/op ensemble.
  Les erreurs de persistance et courses sont couvertes. Une réconciliation
  exacte crée seulement REJECTION_ONLY, puis rejet et MCP REJECTED permettent
  le retry existant sans assouplissement. Aucun lecteur historique n'est
  restauré après ce reçu ; une perte de contexte reste refusée.
- Le bootstrap démarre un contrôleur original dont le SHA-256 est épinglé,
  un superviseur original, un vrai broker Python stdio et un vrai moniteur.
  L'API OpenCode est une fixture HTTP/SSE contrôlée. Le service manager est
  un adaptateur ; seuls les enfants de la fixture sont arrêtés ou relancés.
- Le refus HELD original est réellement observé. La preuve d'amorçage permet
  seulement le nouveau chargement autorisé, puis adoption et vrai HELD. Les
  identités, PAUSE des pairs, préfixes et processus préservés sont comparés.
- La transition mixte qualifiée garde broker/superviseur/Web 1.7.1, charge
  contrôleur 1.8.0 et annonce chaque version. Le même broker conduit le
  rejet, le polling, le retry, un nouveau prévol, once fraîche, /usr/bin/true
  avec exit 0, libération de l'accès puis complete. Aucun métier n'en découle.
- Le mode managed-release conserve l'ancienne release et bascule seulement
  l'entrée contrôleur en M2. Une maintenance ordinaire M3 distincte est
  ensuite testée jusqu'aux quatre processus réellement 1.8.0. L'échec après
  installation restaure les anciens pointeurs et versions actives. OpenCode
  reste en place ; aucune permission supplémentaire n'est émise par M3.
- Les refus couvrent PAUSE manquante, pair occupé, PENDING supplémentaire,
  compteurs incohérents, permission ou effet, preuve expirée, stage/journal
  altérés, lien absolu/échappant, layout divergent, versions non qualifiées,
  interruption aux phases persistées et repli conservatoire.
- approval-metadata effectue seulement GET, projette une observation déjà
  disponible et filtre les contenus privés. Une identité absente reste
  inconnue et la provenance est historique. Le traitement ne décide pas une
  demande legacy non routée et ne lui invente aucun owner.

checkRecoveryRetry conserve exactement le SHA-256
6dcbb0ac71745215e04fb000fa5a8534433ee591ca4c882bb903719fc3bc335a.
Les quatre autres gardes inchangées sont détaillées dans source-final.json.
Le manifeste du contrôleur source comporte 12 fichiers, empreinte canonique
8c0a6d2002d3622da6ad313bf9c48b422588d909bec88c5a523114effdbfd874.
Le manifeste original installé, lu sans modification, comporte 11 fichiers,
empreinte 855b04a4118cc9bb7f2f5b41dfe71fb5e10c11610d65351f59f6a95d310d562d.
Les deux manifestes complets sont dans activation-manifests-final.json.

## Revue de cohérence documentaire

| Document | État et preuve de revue |
| --- | --- |
| AGENTS.md | Inchangé : autorisations, secrets, racine et règles Git conservés ; vérifié par empreinte de la base. |
| PROJECT.md | Mis à jour : référence 1.8.0, capacités et pilotage concurrent ; SCM direct et maintenance distingués. |
| TECHNICAL.md | Mis à jour : notification orpheline, maintenance gelée, journaux, releases et diagnostic filtré. |
| BUILD.md | Mis à jour : jeu 1.8.0, fermeture distribuée, preuves de chargement et limites de déploiement. |
| DEVOPS.md | Inchangé : les chemins de runtime, navigateurs et référentiel de prompts restent valides ; empreinte conservée. |
| README.md | Mis à jour : prévol orphelin, versions mixtes, releases et référence de diagnostic. |
| CHANGELOG.md | Entrée unique 1.8.0 de préparation source, nouvelles options et limites ; historique antérieur conservé. |
| openspec/specs/ | 13 canons strictement valides après synchronisation par les deux archivages natifs. |
| ORCHESTRATED_CODING.md | Référence concurrente et bootstrap monitoring réconciliés ; égalité documentaire testée dans la suite finale. |
| Commande/skills/références distribuées | Versions 1.8.0, procédures de maintenance, aucune activation implicite. |

La revue par empreintes compare les seuls chemins de la base autorisée et
les répertoires source concernés, sans inspection Git. source-final.json
contient l'inventaire détaillé ; ce n'est pas un décompte exhaustif de toute
l'histoire du lot L1 antérieur à la base SCM. Les changements de version
touchent les annonces existantes et les tests associés, pas les règles métier
étrangères au correctif. Les copies Python restent identiques à src/.

## Essais intermédiaires et limites restantes

Les trois échecs documentaires du L1 initial ont été résolus par la mise en
cohérence des références et du protocole, sans désactivation de test. Une
suite intermédiaire a relevé deux attentes de fixture erronées : l'ancienne
entrée plate était volontairement remplacée, et updatedAt était rafraîchi
par la télémétrie. La comparaison conserve tous les champs sémantiques ;
elle distingue désormais installation plate et release immuable et neutralise
seulement cet horodatage de lecture. Une première entrée monitor par lien
n'exécutait pas son bloc CLI ; la résolution de l'entrée est maintenant
corrigée et testée sur les processus réels. Les traces d'échec sont conservées.

La suite finale remplace ces résultats intermédiaires, sans les effacer.
Il ne reste aucun échec connu dans le périmètre source qualifié. L'activation
réelle reste distincte et bloquée par les preuves opérationnelles à établir :
traitement de la demande legacy non routée, PAUSE des pairs, autorisations M2,
réparation et M3, disposition intercomptes du broker lancé depuis CAB/src.
Le code source de cette entrée est déjà 1.8.0, mais le processus chargé reste
1.7.1 ; les tests M3 sur racines possédées par un même acteur ne qualifient
pas cette disposition réelle. Voir
ACTIVATION.md. Ni une archive, ni la version 1.8.0 ne prouvent une livraison
chargée ou une reprise métier autorisée.

## Archivage et clôture source

Les commandes natives archive ont réussi pour les seuls changes ciblés le
25 octobre 2026 : L1 ajoute cinq exigences ; L2 en ajoute treize et en
modifie dix-huit, sans suppression ou renommage d'exigence. Les dossiers
réels sont 2026-10-25-fix-orphaned-validation-admission et
2026-10-25-support-frozen-recovery-controller-maintenance sous
openspec/changes/archive/. Chacun possède STATISTIQUES.md, dont les six
sections, UTF-8/LF, tâches et totaux partagés sont vérifiés. Le contrôle
global strict après archivage réussit sur les 13/13 canons, sans change
actif restant dans ce périmètre. Preuves : archive-l1.json, archive-l2.json
et openspec-release-after-archive.json sous .cab-scm-1.8.0-work.

La clôture porte sur la correction source 1.8.0 et ses archives. Elle ne
constitue aucune activation ou décision opérationnelle.
