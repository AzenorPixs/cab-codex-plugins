# Qualification SCM — changements à chaud CAB2.1.19

## Mandat et contrat cible

Le développeur valide le SCM des deux limites (raccord fournisseur V2 et politique du job) puis CABU. Il précise que la session peut changer à chaud de fournisseur/modèle/raisonnement sans contrainte de sa politique antérieure ; sans choix explicite, elle suit la PLLM. Un seul change support-hot-model-transitions, code non attribué selon ACL consulté sans attribution. La consigne permanente impose CABU après SCM réussi, avec preuves distinctes. Aucun raccord réel ou adoption des jobs des pairs n’est déduit de cette livraison logicielle.

## Réalisation

Le client qualifie le schéma natif et utilise integration.connect.key avec source secrète privée, sans lecture de GET /api/credential ni du stockage privé. Le helper provider-connect vérifie version du contrôleur, workspace/location globale, pauses, quiescence et cohorte stable, puis sérialise le raccord avec verrou et reçu non secret. Il distingue refus avant effet et effet possible ; une reprise réconcilie le même reçu sans réinjecter la clé. La clé n’est ni argument ni sortie, checkpoint ou sauvegarde CAB. Le stockage natif nécessaire est documenté, distinct de la mémoire du processus appelant.

POST /runs/<run_id>/job/model-transition fournit prepare/commit/cancel/reconcile/retry. Le dernier choix explicite est libre de l’ancienne politique et ne lit pas de catalogue obligatoire ; sans choix, la PLLM actuelle est résolue. À chaud, un modèle explicite reste utilisable avec un niveau natif exposé hors medium/high si ces préférences ne sont pas disponibles. Les choix/absences historiques sont conservés sans réinterprétation. La nouvelle preuve native doit être postérieure à la préparation et sans outil ; le choix et la connexion opaques sont relus autour de l’effet. RUN/job/session, critères, jalons, écritures connues, réservations et permissions restent conservés. L’armement ordinaire reste immuable ; la supervision et RESUME sont bloqués pendant la transition. Une phase persistée précède l’effet et une interruption reste réconciliable sans rejeu aveugle ni effacement de l’historique.

## Preuve native exacte2.2.0

Le schéma public du serveur vivant a été lu par une requête authentifiée bornée, sans affichage de credential ni opération d’écriture : version2.2.0/PID1576588. Le binaire officiel2.2.0 a été téléchargé comme seul artefact de test ignoré, non installé ; archive SHA2566d597970a8cc448f1b9a9f645532584b339dd3ab9583bb5f063f13d83e54768f. Provenance : https://github.com/anomalyco/opencode/releases/tag/v2.2.0 ; reçu de téléchargement dans output/scm-hot-model/native20-provenance.json.

Le banc privé exact emploie uniquement des comptes synthétiques et un fournisseur HTTP loopback. Il prouve que les générations suivantes des sessions existantes utilisent la nouvelle clé native sans reload/dispose ; le changement de compte est partagé pour l’intégration concernée, pas présenté comme isolé par job. Il change ensuite le fournisseur de la seule session cible via le contrôleur CAB et un même job historique, avec prévol natif sans outil, broker réel et historique restauré après redémarrage du seul contrôleur privé. Le processus OpenCode, les sessions et le job restent identiques ; le pair garde son fournisseur. Le schéma du banc est exactement celui du serveur vivant : SHA256b1f2a83ae35e8d00dd9dd366bda0b3785459e465432f8c887570ac3acb87aaf9. Aucun résultat2.2.0 déduit d’un banc2.2.2.

Le second banc privé2.2.0 conserve catalogue/outils natifs, édition partielle ask/once, refus et récupération. Les deux tests passent. Les processus et artefacts temporaires du banc sont nettoyés ; aucun secret réel, clé fournisseur réelle, job ou stockage privé partagé inspecté/modifié. Les interfaces d’écriture du serveur partagé n’ont pas été essayées pendant cette qualification.

## Vérifications finales

- Node global en deux groupes disjoints : concurrent-controller132/132 ; autres469réussis/29ignorés sur498. Total unique630cas :601réussis,29ignorés conditionnels,0échec dans les passages finaux. Durées32,956s et54,470s, non additionnées comme temps mural.
- Python80/80,4,566s ; natif exact2.2.0 :2/2,10,542s.
- Syntaxe64JavaScript/16Python ; copies broker identiques, UTF-8/LF ; empreintes AGENTS/DEVOPS/ORCHESTRATED identiques au début du mandat.
- OpenSpec17/17 standard et strict avant archive ; deltas transport, choix modèle, supervision et distribution. Contrôle après archive effectué séparément.
- Ciblés : refus avant clé/HTTP, compte/pair/identité divergents, confidentialité des erreurs/receipts, pipe CLI, verrou et reprise du reçu terminé ; job historique vs durable, choix explicite sans catalogue, PLLM mode2 par défaut, prévol périmé, connexion changée, versions divergentes, annulation, échec avant/après effet, persistance finale échouée et réconciliation sans second changement natif. Les tests HTTP conservent l’ancienne immutabilité d’armement et les critères métier.

Les premiers essais du nouveau banc ont révélé l’activation asynchrone des méthodes d’intégration : le client attend la liste native après résolution de la location globale avant lecture ciblée. Les fixtures nouvelles ont été corrigées pour leurs preuves/références et une date de catalogue stable ; aucune garde n’a été retirée. Deux paragraphes de timeout préexistants dans le protocole local0.6 divergeaient des références distribuées : seule leur concordance a été restaurée, contrôles maintenus. Aucun changement de comportement de timeout ni écriture du template/protocole racine.

Preuves ignorées : output/scm-hot-model/{native20-provenance.json,native-live-contract.json,native20-final.log,provider-client.log,components-final.log,targeted-final.log,distribution-targeted.log,transition-http-final.log,concurrent-global.log,other-global.log,python-global.log,qualification-results.json,source-verification.json,reference-concordance.json,openspec-before-standard.log,openspec-before-strict.log}.

## Matrice documentaire

| Élément | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé pendant ce mandat ; autorités, secrets, tests et clôture SCM appliqués. |
| PROJECT.md | Version2.1.19, choix explicite à chaud/PLLM par défaut et lien opératoire. |
| TECHNICAL.md | Version, transition du même job et séparation raccord/activation. |
| BUILD.md | Version commune, nouveaux modules distribués, CABU puis information obligatoires. |
| DEVOPS.md | Généré et inchangé ; chemins d’outils relus, serveur vivant2.2.0 distingué du CLI installé2.2.2. |
| DEVELOPMENT_MAP.md | Seule entrée provisoire du change, états/liens ajustés après archive ; aucun code attribué. |
| openspec/BATCH_CODES.md | Entrée provisoire distincte, attribution ACL ultérieure ; codes existants conservés. |
| README.md | Version et procédure publique de changement à chaud. |
| CHANGELOG.md | Entrée2.1.19, compatibilités et absence d’adoption implicite. |
| openspec/config.yaml | Inchangé, schéma spec-driven. |
| openspec/specs/ | Quatre capacités ciblées, cohérence du nouveau choix avec l’armement ordinaire immuable. |
| Plugin/skill/commande | Référence hot-model-switch.md complète, helper provider-connect, modèle de transition et liens actifs ; alias restent délégants. |
| concurrent-runs.md / récupération skill/commande | Deux paragraphes alignés sur le protocole0.6 préexistant, contrôle exact conservé. |
| ORCHESTRATED_CODING.md / template | Aucune écriture par ce mandat ; empreinte du protocole racine conservée. Sa contribution préexistante non commitée est préservée et incluse dans le commit complet SCM, sans édition du template. |

## Activation et application réelle

Après archive/statistiques/publications vérifiées, CABU installe et vérifie les quatre versions sans fermer OpenCode ni modifier les RUN. Les propriétaires reçoivent le contrat V2 exact et les preuves d’activation ; le raccord réel partagé et la transition de chacun de leurs jobs conservent leur mandat corrélé. Aucun PAUSE levé, compte réel changé, job réarmé ou choix appliqué automatiquement. Les écritures connues restant à tester/publier appartiennent à leurs RUN et ne sont ni revalidées ni déclarées livrées par ce SCM.
