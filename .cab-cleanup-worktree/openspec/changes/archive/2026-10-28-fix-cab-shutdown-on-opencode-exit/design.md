# Conception

## Identité et preuve
Chaque service attend une première réponse V2 authentifiée puis mémorise PID et starttime depuis /proc/<pid>/stat. Le contrôle local est non recouvrant, toutes les 500 ms. Une identité absente à l’admission, illisible ou invalide ne donne pas de preuve de fermeture. Après rattachement seulement, absence, zombie ou changement de starttime prouvent la fin de l’instance. Aucune ligne de commande, environnement privé, credential ou contenu runtime utilisateur n’est inspecté. Les transports sont loopback ; le contrat concerne un serveur et des services dans le même espace de PID local. Une identité non vérifiable produit un diagnostic filtré et conserve le service.

## Arrêt
Un arrêt idempotent stoppe les admissions et minuteries, annule les SSE, ferme les serveurs HTTP et attend les écritures statistiques ainsi que la terminaison du helper. Le délai de nettoyage est borné à quatre secondes après détection, pour une cible totale de cinq secondes. Un arrêt réussi sort 0. Un nettoyage en échec ou hors délai sort 78 avec diagnostic ; RestartPreventExitStatus=78 empêche une boucle systemd tout en distinguant l’échec. Les autres pannes conservent Restart=on-failure. Les ressources restantes sont libérées par le groupe de contrôle systemd ; aucun processus étranger n’est ciblé. Le broker reste géré par OpenCode et termine sur EOF MCP.

## Préservation métier
Ni arrêt de job, ni gate terminal, ni décision, ni libération de réservation ne sont synthétisés. Les protections d’effets inconnus restent conservées. Les écritures techniques de déconnexion et statistiques sont permises ; les champs métier, décisions, identités et protections sont vérifiés séparément. Une reprise ultérieure est explicite et soumise à la réconciliation normale. Le moniteur continue lors d’une panne du contrôleur ; il termine uniquement après preuve locale de disparition du serveur suivi.

## Compatibilité et concurrence
Le démarrage sans OpenCode reste possible, sans conclure à sa fermeture avant rattachement. Aucun basculement automatique vers un autre PID après rattachement. Aucun changement des variables utilisateur ni des formats métier. Les imports du moniteur sont distribués aussi dans son répertoire dédié. L’incrément global attend la frontière d’écriture de l’autre session ; aucune réécriture de ses preuves, archives ou modifications fonctionnelles. Le repli de source est le jeu source précédent ; une installation ultérieure utiliserait l’updater transactionnel, hors présent mandat.

## Incrément de la cible de maintenance
Les attentes des bancs utilisent le paquet courant. Les trois exigences de maintenance mentionnant explicitement la cible 2.1.5 sont reprises dans le delta avec leurs scénarios conservés et la seule cible passée à 2.1.6. Les fixtures qualifiées par l’autre session sont conservées, seules leurs attentes de cible courante sont alignées. Le paquet 1.7.1 et les preuves 2.1.5 sont immuables ; leur réussite ne prouve pas celle de 2.1.6, qui doit réexécuter ces bancs. L’admission du broker chargé 2.1.5 est conservée explicitement dans la liste des versions admises.

## Sceau : défaut reproduit et correctif autorisé
Le passage global 511/512 a révélé maintenance-bootstrap-not-admissible. Une reproduction déterministe faisant franchir une vraie frontière de milliseconde entre appels a produit 60001 ms avec le code initial. Le correctif validé capture createdAt une seule fois et calcule expiresAt depuis cet instant. La copie isolée a produit exactement 60000 ms et repris la transaction. Les contrôles restent inchangés, et une régression source vérifie capture, interruption et reprise.
