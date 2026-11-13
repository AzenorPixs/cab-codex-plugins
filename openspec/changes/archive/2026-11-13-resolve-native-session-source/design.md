# Résolution ciblée des sources Codex

Le service expose native.locate en lecture seule, sans créer de RUN. Il résout
le compte POSIX authentifié et sa racine .codex, ou le CODEX_HOME explicitement
transmis par le client. Le SID UUIDv7 donne le jour UTC exact sous sessions ;
seuls les noms de ce dossier sont examinés, avec un plafond de10000entrées.
Seul le fichier dont le nom se termine par le SID exact peut être ouvert.

Le service vérifie l’en-tête session_meta, le propriétaire, le type régulier,
l’absence de liens symboliques et de liens physiques multiples, le SID et le cwd.
Aucun message n’est renvoyé. Une absence ou ambiguïté refuse la résolution.
Les SID non UUIDv7 et les stockages différents gardent la liaison explicite.

native.bind accepte aussi l’absence de source_file et utilise ce résolveur.
Une liaison identique est sans nouvel effet ; une autre source reste refusée.
Les chemins et inodes restent dans le mandat privé du RUN, sans modifier ses
identités, reçus, génération, critères ou gel natif. Les collecteurs existants
restent inchangés ; la résolution n’est pas une validation de test.

Le CLI native-source et MCP native_locate donnent le parcours public de prévol.
Le CLI lit CODEX_THREAD_ID/CODEX_HOME sans scanner les profils. Les clients MCP
déjà chargés peuvent utiliser cab call native.locate/native.bind sans redémarrage.
Livraison3.0.5 par DIU et finalisation Debian ; aucun test DIU n’est rejoué.
