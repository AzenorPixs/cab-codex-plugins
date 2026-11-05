# Qualification SCM — distribution CAB2.1.30

30octobre2026. Correctif de livraison lié au mandat initial de permissions, code non attribué ; attribution ACL ultérieure.

CABU29 a échoué parce que permission-policy manquait dans monitorScripts ; le contrôle d’import source global le considérait présent via le groupe primaire. Reçu update-8e1d1a80-d0cd-47be-a09f-b9c5d13a3a88 ROLLED_BACK, invocationexit1, erreur update-active-version-unconfirmed ; services28 et broker29 observés ensuite, aucune29réputéeactive et aucune compatibilité métier de cet état mixte déduite. Archives et preuves29 conservées.

Le module est maintenant inclus dans monitorScripts. Chaque import relatif statique ./ ou ../ est vérifié contre sa source ET sa destination réelle ; un autre groupe ne satisfait plus une dépendance absente. Erreur update-package-import-missing avant coupure. Le client installé en layout géré est réellement importé par Node et expose nativePermissionPolicy. Un module supplémentaire présent seulement dans le groupe primaire est refusé sans stop/start.

Node684cas :653réussis/31ignorés/zéroéchec ;136concurrence en33,852062s et517autresréussis sur548cas en60,838814s. Python81/81 en4,771s. Natif privé exactOpenCode2.2.0 :4/4 en20,746525s. Total réussi738, ciblés non additionnés. Syntaxes72JS/16Python, trois copies broker identiques, UTF-8/LF et empreintes protégées. OpenSpec standard/strict17/17 avant archive.

Premier ciblé d’import installé arrêté par la garde de propriétaire/mode, car les répertoires de fixture étaient modifiables par le groupe. Le test a préparé ses seuls répertoires privés en0700, puis67/67ciblés et globalréussi. Aucune garde produit relâchée. Le contrôle ask et sa politique partagée sont inchangés ; natif denyavantprompt, levée minimale explicite et prévolavec once restent réussis. Aucun modèle, session ou permission de production modifié.

AGENTS,DEVOPS,ORCHESTRATED_CODING et concurrent-runs conservés ; aucun template modifié. Source clôturée séparément du29, sans réarchivage ni réécriture d’historique. Activation30 et information nécessitent leurs reçus réels après publication. Preuves : output/permission-distribution30/.
