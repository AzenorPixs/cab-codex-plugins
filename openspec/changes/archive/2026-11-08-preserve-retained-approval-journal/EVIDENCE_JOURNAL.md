# Divergence et état du journal — 8 novembre 2026

Après le reçu propriétaire `APPLIED` de C08 en 2.4.38, le broker a signalé
`STORE_JOURNAL_DIVERGENCE`. Le diagnostic local indiquait une approbation
`REJECTED` conservée, avec un événement de création et un événement terminal
manquants ; aucune autre catégorie de divergence n’était observée.

Après une reconnexion du broker, la cohérence était à nouveau vérifiée et deux
événements `APPROVAL_CREATED` et `APPROVAL_REJECTED` étaient présents avec des
horodatages postérieurs à l’incident, sans indicateur de reconstruction. Ils ne
sont pas présentés comme les événements originaux : leur origine exacte et les
octets initiaux ne sont pas établis. L’incident est enregistré sous CCAB 52.

Le correctif en préparation conserve ensemble les approbations non ciblées et
leurs événements ; les futurs événements explicitement reconstruits portent un
marqueur de provenance. Aucun rejeu de décision métier n’est nécessaire.
