# Qualification SCM — moniteur CAB 2.1.27

30 octobre2026. Change unique, code non attribué ; attribution ACL ultérieure.

Le clic archive/delete/restore persistait le catalogue mais l’application attendait une actualisation de vue ; SSE restait seulement en buffer. Le serveur renvoie maintenant la projection confirmée dans la réponse catalogue ; la page l’applique immédiatement en conservant la cadence, invalide les lectures en vol et leur rollback d’erreur. Les refus ne masquent rien. Un reçu sans vue valide indique rangement enregistré mais affichage non confirmé et ne rejoue pas de POST. Aucun rangement de sources ou changement des gardes.

BLOCKED bleu#e5efff, DONE vert#e4f4e9, STOPPED orange#ffebd6 ; WAITING jaune conservé. Sélection distincte et UNKNOWN sans couleur courante, texte/étape inchangés.

Node final :657cas,627réussis/30ignorés conditionnels/zéroéchec (concurrence136/136 en34,906747s ; autres491/521 en54,103630s). Python81/81 en5,062s. Natif privé exactOpenCode2.2.0 :3/3 en17,514483s. Total exécuté réussi711, ciblés non additionnés. Syntaxes69JS/16Python, trois copies broker identiques, empreintes protégées et UTF-8/LF. OpenSpec standard/strict17/17 avant archive.

Chromium156.0.8078.73 et Firefox153.6.0 : deux campagnes complètes et deux campagnes ciblées catalogue, quatre recettes au total, sans les additionner au total711. Qualifiés : archive/restauration/suppression immédiates en Manuel, archives RUN et change sans reload, ancienne réponse et erreur HTTP sans rollback, cadence conservée, refus serveur sans masquage, reçu incomplet sans masquage ni POST rejoué. Styles calculés des trois couleurs, sélection et UNKNOWN. Vérification visuelle du screenshot desktop ; mobile sans débordement dans les deux navigateurs. Les fixtures utilisent /monitor/runs depuis la correction26 ; aucune nouvelle capacité liée à cette adaptation du banc.

Essais initiaux conservés : assertion navigateur contenant un point-virgule dans une chaîne traitée par le banc comme script sans return ; critère corrigé sans changement du produit, campagnes finales réussies. Une campagne Node initiale a dépassé le délai de démarrage2s d’une fixture de récupération pendant les recettes navigateur (un sous-test et son parent signalés, deux échecs). Le fichier concerné est ensuite passé45/45 et le groupe complet a été réexécuté avec succès, sans changer les délais ni le code de récupération. Cette première campagne n’est pas présentée réussie ni additionnée aux totaux finaux.

AGENTS,DEVOPS,ORCHESTRATED_CODING et concurrent-runs conservés parSHA256 ; aucun template modifié. Les catalogues et services utilisés pour les tests sont privés, les ressources et RUN actifs restent préservés. Publication puis CABU et information nécessitent leurs reçus distincts ; une page déjà ouverte devra charger une fois le nouveau JavaScript. Preuves locales non versionnées : output/monitor-ui27/.
