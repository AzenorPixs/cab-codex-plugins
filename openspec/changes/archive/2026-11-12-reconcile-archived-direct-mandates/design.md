# Conception

Le propriétaire du RUN direct appelle run.reconcile_archive avec project_id,
run_id, archive_path et expected_framing_digest. Le verrou du RUN protège la
transaction ; toute opération non terminale ou bail HELD bloque l’amendement.
L’archive est exactement openspec/changes/archive/AAAA-MM-JJ-<change>, canonique,
existante avec proposal.md et tasks.md. L’ancien chemin doit avoir disparu.
Seuls les chemins égaux ou descendants du change sont substitués ; aucun autre
paramètre du mandat n’est amendable par cette commande. La nouvelle révision est
calculée avant écriture. Un événement durable et un historique borné conservent
les digests avant/après ; un second appel identique retourne le même résultat.
Le SID, le RUN, la génération, les métriques, native_frozen_at et les opérations
restent inchangés. Les anciens reçus ne sont jamais réétiquetés ou réémis.

Le client MCP rapporte les erreurs ClientError avec le request_id et interdit
le retry implicite. Une absence d’opération est NOT_FOUND au moment de lecture ;
elle n’entraîne jamais une exécution. Les erreurs d’admission restent non
confirmées tant que la lecture du reçu ne les a pas réconciliées.

## Validation
Tests transactionnels sur PostgreSQL de fixture et fichiers temporaires : succès,
idempotence, erreur de digest, autre compte, autre change, symlink, source encore
présente, opérations WAITING/UNKNOWN et baux. Régressions du delta local,
construction TypeScript et navigateurs, paquet et contrat installés séparément.
