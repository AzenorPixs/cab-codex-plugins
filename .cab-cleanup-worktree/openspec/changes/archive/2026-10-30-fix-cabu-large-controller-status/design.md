# Conception

Le lecteur HTTP de maintenance compte les octets avant parsing. Seuls GET /runs et GET /status exacts utilisent REGISTRY_MAX_BYTES16Mio ; POST, chemins avec query, /api/snapshot et toutes autres réponses gardent2Mio. Le client OpenCode et ses historiques ne changent pas.

update-response-too-large traverse wait et startAll sans être masqué comme un démarrage absent. Le rollback non confirmé reste non terminal, selon le correctif2.1.15. Aucune troncature, purge de statut ou réduction des RUN n’est utilisée.

Le nouveau build conserve la base2.1.15 et les trois modules broker identiques. Le contexte du journal n’inclut pas le chemin du cache et son lecteur autorise la reprise par un paquet corrigé de la même version. La procédure native vérifie/restaure les artefacts du journal ; seul ensuite un nouveau cycle peut installer le build corrigé. Aucune preuve de succès n’est construite depuis un simple service active.
