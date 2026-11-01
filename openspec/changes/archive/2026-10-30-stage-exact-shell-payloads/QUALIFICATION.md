# Qualification SCM — CAB 2.1.25

30 octobre 2026. Un seul change, code non attribué ; normalisation ACL ultérieure.

Le staging conserve un nouveau payload Bash revu et son SHA256, sans validation, décision, accès ou exécution. Le modèle ne transmet que la commande courte ; le validateur automatique reçoit le corps exact depuis le stage privé corrélé. La livraison exige décision approuvée, même job/SID/CWD/RUN/version/opération, accès EXECUTING non restauré et once acquittée. Les limites existantes restent applicables au corps et au transport.

Banc natif privé OpenCode exact 2.2.0 : payload de 9 860 octets, absent des arguments du modèle, sortie attendue et exit 0. Une corruption de même longueur termine le lanceur exit 125 avant le payload. La permission du lanceur est alors consommée ; aucun rejeu n’est permis. Avant décision, après décision mais avant accès/once, et après fin native, GET payload est refusé. Les identités, commandes et sorties natives sont observées séparément de HTTP.

Node : 650 cas, 620 réussis, 30 ignorés conditionnels, zéro échec (135 concurrence et 485 autres réussis). Python : 81 réussis. Campagne privée native : 3 réussis ; les cas ignorés du global ne sont pas comptés comme réussis. Total exécuté réussi : 704. Durées : concurrence 34,332415s ; autres 55,957603s ; Python 4,941s ; natif 17,026458s. Syntaxes : 69 JavaScript et 16 Python, dont copies broker ; les trois copies sont identiques. OpenSpec standard et strict : 17/17 avant archivage.

Les contrôles positifs et négatifs couvrent immutabilité, idempotence, UTF-8 exact, Unicode composé/décomposé, CRLF sans normalisation, taille, extra-clés, stockage privé/restauration, symlink, SID étranger, PID/contexte, once absente, accès restauré et hash/corps/CWD/HTTP divergents. Le lanceur conserve stdin, environnement, CWD et exit. Aucun redirect ni retry. Staging sous permission shell non ask refusé.

AGENTS.md, DEVOPS.md, ORCHESTRATED_CODING.md et concurrent-runs.md conservés par SHA256. Aucun arrêt/reload du processus OpenCode, aucune configuration native ajoutée. Les sources, versions, documentation et tests sont qualifiés. Publication distante, activation CABU puis information des sessions nécessitent leurs reçus distincts après clôture source ; ils ne sont pas déduits de ces tests. Preuves détaillées locales non versionnées : output/exact-shell-carrier/.
