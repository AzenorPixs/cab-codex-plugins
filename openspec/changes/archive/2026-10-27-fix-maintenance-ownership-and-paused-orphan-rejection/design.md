# Conception et critères de CAB 1.10.7

## Propriété
expectedUid conserve l'UID des processus OpenCode/broker. Les champs optionnels artifactOwnerUid et directoryOwnerUid lient explicitement le propriétaire des fichiers et du répertoire ; leur omission conserve le contrat précédent. Les propriétaires admis sont l'acteur de maintenance et l'UID broker déclaré. Le groupe, les empreintes, la régularité, les modes, le répertoire réel et les identités PID/startTime restent vérifiés avant et après effet. Le mode reuse-readonly ne change jamais les fichiers broker.

## Demande orpheline
recoveryId=null distingue le job courant suspendu du prévol historique. Le contrôleur exige PAUSE, job armé, session/change/réservation exacts et currentCabMandate vide ou égal à la demande. Il vérifie le préfixe natif et la séquence depuis l'unique request_validation exact : réponse PENDING, ou timeout -32001 suivi d'un polling PENDING corrélé. Aucun autre outil, permission native ou effet n'est admis dans cette séquence. L'inactivité, le MCP et la santé sont recontrôlés. Le registre crée propriétaire/opération/reçu REJECTION_ONLY atomiquement, même si l'admission initiale n'avait rien persisté. Aucune acquisition ou approbation ne devient admissible. Une preuve différente reste refusée.

## Qualification et exploitation
Les tests couvrent propriétaires autorisés/inconnus, ancienne preuve compatible, dérives et liens, deux UID réels dont artefacts détenus par l'acteur, refus sans mutation, polling et timeout, doublons et effets. La suite globale et OpenSpec strict précèdent l'archive et STATISTIQUES.md. La distribution 1.10.7 est installée via le mécanisme plugin ; le cache n'est pas édité. Les anciennes releases, journaux et états sont conservés. Si l'ancien contrôleur ne peut enregistrer le refus d'une demande absente, une décision explicite de rejet peut être enregistrée par l'outil manuel reject du broker existant, avec preuve REJECTED du même approval_id avant fermeture du mandat ; aucune approbation n'est transmise. La maintenance et la reprise métier restent distinctes.

## Repli
Les mécanismes de repli du updater restent applicables avant sa frontière de reconnexion ; après cette frontière, conserver HELD et reprendre le même journal. Aucun ancien état métier n'est restauré. Une qualification ou une preuve manquante conserve les RUN en PAUSE.

Le reçu générique emploie recoveryId=null dans le schéma 4 existant. Après son premier usage, un ancien lecteur qui exige un recoveryId textuel refuse ce registre ; un retour de code ancien exige une réconciliation/conversion distincte et ne peut restaurer un ancien registre effaçant des décisions. L'activation présente a clos l'ancien PENDING par rejet manuel avant maintenance, sans création d'un tel reçu sur l'état vivant.
