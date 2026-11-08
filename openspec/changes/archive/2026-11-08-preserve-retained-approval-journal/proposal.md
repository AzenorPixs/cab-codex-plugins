# Préserver le journal des approbations conservées

## Pourquoi

Un nettoyage peut conserver une approbation non attribuée tout en retirant ses
événements de journal par collision d'identifiant. Cela laisse le broker en
divergence et ne doit pas affecter les autres sessions.

## Changements

Projeter le magasin et le journal avec la même attribution, conserver ensemble
les approbations non ciblées et leurs événements, et qualifier une réconciliation
explicite pour les événements déjà manquants. Une reconstruction issue du
magasin doit être identifiée comme telle et ne rejoue aucune décision.
