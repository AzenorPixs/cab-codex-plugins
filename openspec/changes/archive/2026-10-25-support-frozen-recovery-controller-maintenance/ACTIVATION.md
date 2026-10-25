# Proposition opérationnelle distincte de la préparation source

Cette proposition n'autorise aucune opération vivante. Le SCM réalise les
sources et les tests isolés de CAB 1.8.0 ; aucune installation dans le profil
de services, modification du registre Pixs, relance ou reconfiguration MCP
n'a été effectuée. Le broker vivant est toutefois lancé depuis un fichier
source CAB modifié par ce SCM : voir le chevauchement ci-dessous. Les preuves de qualification
figurent dans QUALIFICATION.md. Tous les paramètres ci-dessous sont des
observations historiques à recontrôler avant une décision opérationnelle.

## Frontières et blocages observés

La maintenance gelée est refusée tant que le compteur global contient une
autre demande PENDING que le prévol courant. L'observation native recueillie
pendant le SCM en comptait deux. Une transmission du chat C08 a retrouvé
l'origine historique de apr-1063d28a23324b90 dans l'ancienne session
ses_e9e5f0de2ffeiVX4NJuQJfjP9n : requestId auto-généré
req-b4e46f963b37415f, appel prt_16cf2cdef001bakv99y1vq4SN0 du
2026-10-24T08:06:54.809Z. La demande ne portait ni RUN, ni session, ni
directory, ni manifeste de coordination exploitables. Cette attribution
historique ne crée aucun propriétaire dans le registre. Un complément natif
transmis par le chat propriétaire distingue l'écriture ultérieure : elle est
corrélée à une nouvelle demande source-17ac43e512be46339938ebec5fcfc67a,
une autre approbation et l'opération COMPLETED
op-38aaa86eb87746e880c42859b3427a82. Les preuves de cette opération doivent
être conservées ; elles ne doivent pas être réattribuées à la demande ancienne.

Le L1 de cette livraison concerne un prévol coordonné dont le propriétaire et
l'opération existent. Il ne doit pas réparer cette ancienne demande non routée,
compléter ses champs, l'admettre dans un RUN ou lui attribuer une autorisation.
Le diagnostic approval-metadata projette seulement une observation existante ;
une décision conservatoire sur la demande ancienne nécessitera des preuves
actuelles, une procédure applicable et une autorisation distinctes.

La proposition complémentaire est un refus conservatoire générique des
demandes legacy non routées : identifier la demande native exacte, établir
son absence d'exécution et distinguer les opérations ultérieures autorisées,
puis permettre seulement son rejet explicite, durable et vérifiable par MCP.
Ce traitement ne doit jamais inventer RUN/propriétaire/session/opération ou
rejouer l'effet. Il n'est pas implémenté par le L1 coordonné ; si aucune API
existante ne le permet avec ces garanties, il nécessite un périmètre OpenSpec
et une autorisation source distincts avant réalisation.

### Piste existante 1.7.1 pour le refus legacy, sans exécution

La lecture du broker distribué original 1.7.1 confirme que l'outil MCP reject
appelle do_decide(args, "REJECTED") : il exige approval_id et reviewer,
accepte un commentaire, vérifie le statut décidable, persiste sous verrou et
réconcilie le journal. Il ne complète pas les champs de routage et n'appelle
pas l'admission du contrôleur. Il pourrait donc fermer cette ancienne entrée
par l'API existante, sans installer 1.8.0. Ce constat source ne prouve pas
l'état actuel de l'entrée ni l'autorisation d'utiliser cette API.

Le champ reviewer est déclaratif et ne constitue pas une authentification du
validateur. Le codeur ne peut pas choisir le refus ni se désigner lui-même
comme validateur. Le protocole proposé est le suivant, à autoriser par
l'orchestrateur propriétaire avant tout appel :

1. Lire get_approval et broker_health/readiness natifs du même broker dans
   une session technique existante verrouillée, sans Bash, édition ou once.
   Vérifier l'instance, apr-1063d28a23324b90, req-b4e46f963b37415f, PENDING,
   les champs de routage réellement absents et la stabilité du payload.
   Vérifier l'audit natif et préserver l'opération ultérieure distincte.
2. Relever la cohérence magasin/journal et les deux demandes en attente ;
   conserver les instantanés contrôleur/RUN/jobs et le préfixe de la candidate.
   Toute divergence suspend la proposition sans décision.
3. Le validateur Root consigne lui-même une décision unique explicite REJECTED,
   liée à ces identités, à l'instance et aux preuves actuelles, avec son reviewer
   et son commentaire exacts. Aucun jugement n'est délégué au codeur.
4. Privilégier un appel MCP du validateur. À défaut, un transport technique ne
   peut transmettre que le payload reject fixé par cette décision visible,
   une seule fois, sous contrôle de Root ; il ne choisit ni identifiant,
   reviewer, statut ou commentaire et n'appelle aucun autre outil de décision.
   Si ce transport borné n'est pas contrôlable, ne pas déléguer l'appel.
5. Vérifier REJECTED du même enregistrement par get/poll, cohérence du journal,
   compteur frais global/RUN/session égal au seul prévol coordonné restant et
   absence de changement des jobs, propriétaires, opérations ou préfixes.
   Le prévol courant doit rester PENDING, sans décision ni permission nouvelle.
6. En cas de timeout ou réponse ambiguë, relire l'état avant toute action ;
   aucune nouvelle décision ou répétition automatique. Ne pas remplacer reject
   par cancel_approval, approved ou une écriture de magasin.

Cette piste n'est pas exécutée dans le SCM et n'est pas un nouveau correctif.
Elle ne s'applique jamais au prévol coordonné courant : celui-ci exige le reçu
L1 et le rejet local corrélé avant son retry. Une réussite du refus legacy
ne lèverait pas les autres conditions de PAUSE, de preuve et d'autorisation M2.

Une activité C6 avait été observée et les pauses explicites des pairs ne sont
pas établies ici. Une réservation C7 ou l'absence apparente de trafic ne prouve
pas une frontière sûre. Tous les pairs doivent être explicitement sous PAUSE,
inactifs, sans mandat, permission, opération ou autre récupération en cours.

## Cible opérationnelle d'exemple à préserver

Les identifiants de ce tableau sont seulement l'annexe de reprise C08 ; aucun
n'est codé dans les sources, tests ou contrats génériques.

| Champ | Observation à revérifier |
| --- | --- |
| Workspace | /home/devops/datas/pixs |
| RUN | cismp1-pixs-02716fc18b3546c0 |
| Job | job-9d93432472b146378e2af52bf46c8454 |
| Ancienne session révoquée | ses_e91cd3c92ffekDV8jpJsGxH9O7 |
| Candidate unique | ses_e90f4d2ffffe5JtAqkUyZmJPfq |
| Recovery | recovery-d35b1d2f2ef646a599a33faa8ff42640 |
| Prévol coordonné | resume-c651b0ac740043da8fd4ce5a2dbb457e |
| Approbation du prévol | approval-6c5ce5f963124cc48430366659514ac0 |
| Reservation version / contextId | 1192 / 1147 |
| Révision observée | 72 ; la notification intégrale reste l'autorité |

La candidate comportait quatre parties outils, sans Bash ni permission native,
avec Bash ASK ; l'ancienne session restait révoquée sous DENY. Empreinte du
JSON compact de ces quatre parties transmise par le chat propriétaire :
0b89ba3a60265d7d4526696996842f8f25beb6fe20e85fedd6b7e8aa54c18221.
Une divergence exige de reprendre les preuves, sans réinitialiser l'historique.

## Processus et installation observés

| Brique | PID / startTime / uid historiques | Autorité de service |
| --- | --- | --- |
| Contrôleur 1.7.1 | 1011818 / 8221482 / 1000 | cgpt-approval-bridge-controller.service |
| Superviseur 1.7.1 | 1011915 / 8221536 / 1000 | cgpt-approval-bridge-supervisor.service |
| Web 1.7.1 | 1486182 / 11928627 / 1000 | cgpt-approval-bridge-monitor.service |
| OpenCode 1.19.4 | 1162296 / 41051859 / 1002 | Processus à préserver, jamais arrêté ici |
| Broker 1.7.1 | 1162365 / 41052016 / 1002 | Enfant MCP d'OpenCode, à préserver en M2 |

Instance broker observée : inst-670877a4dd774fe6b1e9c0e0e3d36730.
Le contrôle filtré des métadonnées de lancement transmis par le chat
propriétaire identifie exactement
/home/devops/datas/cab/src/cgpt_approval_bridge_server.py, fichier réel sans
lien, uid/gid 1002/1002, mode 0775. Aucun environnement ou fournisseur n'est
lu par ce contrôle. Le processus broker chargé reste 1.7.1, tandis que les
octets source de cette entrée sont désormais 1.8.0. Les trois modules src/
ont bien été modifiés dans le périmètre source autorisé ; il serait inexact
d'affirmer qu'aucun artefact servant au lancement n'a changé. Une reconnexion
future chargerait ce nouveau code et exige sa propre décision opérationnelle.

Le profil gelé M2 conserve ce processus broker, sans écrire ses artefacts.
La maintenance ordinaire managed-release qualifiée ici suppose des racines
de destination possédées par son acteur ; elle ne fournit pas un mode de
réutilisation en lecture seule d'un broker déjà présent sous un autre uid.
Lancer M3 comme propriétaire des services uid 1000 ne donne donc aucun droit
d'écrire dans src/ uid 1002 ; lancer tout M3 sous uid 1002 ne donne pas non
plus l'autorité sur les services uid 1000. La disposition réelle reste
bloquante pour M3. Ne pas déplacer le broker, modifier son MCP, créer des
liens dans src/ ou changer des droits pour contourner cette frontière.

Une voie à soumettre séparément pourrait réutiliser en lecture seule le jeu
source 1.8.0 déjà présent, prouvé par manifeste, puis reconnecter son MCP sous
l'autorité d'OpenCode uid 1002 et mettre à jour les services sous leur propre
autorité uid 1000. Elle exigerait une spécification et une qualification de
cette frontière entre comptes et de l'absence d'écriture broker. Elle n'est
ni implémentée ni autorisée par la qualification managed-release actuelle.

L'entrée logique du contrôleur est
/home/ade/.local/share/cab-approval-bridge/cgpt-approval-bridge-controller.mjs,
lien relatif vers releases/1.7.1+codex.20261020164727/scripts/ du même profil.
La racine était réelle, mode 0700, propriétaire 1000. Les fichiers hérités
mode 0775 sont protégés par cette racine privée ; ne pas modifier leurs droits.
Le SHA-256 du contrôleur original observé est
3cfb31247836605ea0f04fec4d4ff449c0fc34e8c5b5ee97382d379bfb40913b.

Le manifeste complet original et celui de la fermeture source doivent être
recalculés avec moduleManifest sur les entrées physiques. Le résultat est lié
au fichier de preuve privé ; une version annoncée seule ne suffit jamais.
Les chemins et empreintes exacts de la dernière qualification sont consignés
dans QUALIFICATION.md et ses preuves locales. La nouvelle release M2 s'appelle
releases/1.8.0+build.<digest16>/scripts ; seul le lien du contrôleur bascule.

## Séquence à faire autoriser séparément

1. Terminer l'audit de la demande ancienne non routée et obtenir sa décision
   selon une procédure applicable. Recontrôler le broker réel : le seul PENDING
   global, par RUN et par session doit être le prévol coordonné ciblé. Une
   observation historique ou un champ absent ne satisfait pas cette condition.
2. Obtenir les PAUSE explicites et frontières sûres des pairs, conserver leurs
   identités et réservations. Relever les URL loopback et toutes les identités
   actuelles, sans consulter secrets ou magasins privés.
3. Faire autoriser M2 frozen-recovery-controller pour ces seules briques et
   cette cible. Préparer un JSON privé 0600 avec transactionId neuf,
   authorization, layout=managed-release, target complet, originalManifest,
   expectedBuildDigest et preservedProcesses. Le script distribué update.mjs
   est exécuté depuis le paquet source externe aux destinations avec
   --profile frozen-recovery-controller --frozen-proof-file, --plugin-root,
   --workspace, --home et les quatre URL réelles. Aucun répertoire broker
   n'est requis pour M2. Ne pas lancer une commande avec des valeurs supposées.
4. Vérifier le refus original HELD conservé, BOOTSTRAP_HELD privé puis la
   disparition de l'ancien PID, l'adoption et le vrai HELD du nouveau contrôleur. Exiger
   notificationReconciliation=rejection-only-v1, frozenRecoveryMaintenance=
   frozen-recovery-v1 et maintenanceBuildDigest égal au manifeste autorisé.
   Broker, OpenCode, Web, préfixes, jobs et réservations restent inchangés.
   Le résultat doit annoncer contrôleur 1.8.0 et processus conservés 1.7.1.
5. Faire autoriser la réparation du seul prévol coordonné. POST
   /runs/<RUN>/validation/reconcile reçoit exactement transactionId,
   developerAuthorization, jobId, recoveryId et approval original intégral.
   Le reçu est REJECTION_ONLY. Seule une décision explicite rejected est
   permise ; attendre REJECTED réel du même approval_id. Aucune permission
   native ni acquisition ne découle de cette réconciliation.
6. Faire le retry existant sur mêmes RUN/job/recovery/candidate avec nouvelle
   identité de prévol. Exiger décision, réponse MCP, permission once fraîche
   pour /usr/bin/true, exit 0, libération de l'accès et READY avant complete.
   Ne pas créer une seconde candidate ou rejouer une ancienne permission.
7. Conserver tous les pairs et la cible en PAUSE après complete. Faire
   autoriser M3, maintenance ordinaire avec --layout managed-release, qui peut
   reconnecter le broker et relancer le Web sans fermer OpenCode. Son répertoire
   broker réellement lancé est CAB/src sous uid 1002, tandis que les services
   sont sous uid 1000. Cette disposition bloque le M3 actuel tant qu'une voie
   distincte conforme n'est pas validée ; les uid différents ne sont pas une
   permission implicite d'écriture intercomptes ou de changement de configuration.
8. Exiger les versions actives réellement observées 1.8.0 du contrôleur,
   superviseur, broker et Web, une readiness fraîche après reconnexion, les
   mêmes identités métier et une maintenance libérée. Faire valider chaque
   reprise puis un nouveau mandat métier. complete n'autorise aucun métier.

## Repli

Avant REJECTION_ONLY, M2 peut restaurer le seul ancien pointeur et rester sous
ROLLED_BACK_FROZEN. Après ce reçu, un ancien lecteur incompatible est interdit.
M3 restaure les pointeurs et versions actives précédents en cas d'échec prouvé ;
un résultat ROLLBACK_FAILED conserve le gel et exige réconciliation. Aucun
registre antérieur, historique, décision ou once consommé n'est restauré.
