# Qualification source2.4.3

Code non attribué. Même mandat SCM/CI-CD C12/PA01 ; autorisation initiale conservée, aucune nouvelle transaction.

## Résultats

84cas ciblés réussis sans skip :54unitaires,16intégrations,3propriétaire dont deuxUID réels avec le broker publié2.4.0,5gros reçu/marqueur,3listes historiques,3candidats privés. Preuve output/scm-cab-243/vital-final.tap.84fichiers syntaxiquement vérifiés dont17Python compilés. OpenSpec strict réussi.

Le test de candidats utilise un plan cumulé supérieur128Mio avec un reçu inférieur10Ko, charge le vrai lecteur publié2.4.0 et constate son refus avant toute écriture. Candidat altéré/hors racine refusé sans modification de cible ; reprise d’une cible déjà appliquée sans relecture de candidat disparu, retrait idempotent des candidats. Les intégrations vérifient certificat.scope immuable, effectiveScope enrichi, pairs conservés et candidats retirés.

## Prévol réel en lecture seule

Transaction C12 inchangée erasure-8bf1e6c3-15cc-48ae-8c2a-a501f4bec290, STOPPING, broker APPLIED, services2.4.0 remis en ligne, OpenCode10912 inchangé. Autorisation1017identifiants ; portée broker1115identifiants :98supplémentaires attestés. Le plan enrichi couvre tous les identifiants broker et47candidats. Payloads cumulés166 520 242octets ; reçu avec références et snapshot des pairs estimé15 626 332octets, inférieur à la borne historique64Mio. Aucun état métier n’a été modifié par ce prévol.

L’autorisation n’est plus remplacée par la portée de projection. Les candidats après projection sont privés, hachés et temporaires ; le reçu est compacté avant redémarrage des lecteurs2.4.0. Aucune sauvegarde des états antérieurs du change n’est créée. Les versions de helper et de runtime restent distinctes dans cette récupération.

## Opérations à prouver séparément

Le rapport SGS est produit depuis le service permanent et la session Codex réelle, jusqu’à sa borne native figée. La publication DIU, le recover-preparation sur les PID restaurés, la reprise du même plan, le certificat/PURGED, le CABU global et les résolutions CCAB sont suivis par les reçus opérationnels. Cet archivage source ne les déclare pas réussis. La liberté de lecture/atelier ne constitue toujours pas une isolation globale du processus OpenCode.
