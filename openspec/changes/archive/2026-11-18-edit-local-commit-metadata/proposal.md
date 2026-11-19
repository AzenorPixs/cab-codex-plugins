## Why

Le détail d'un commit dans l'historique doit permettre d'éditer ses métadonnées
sans sortir des overviews CAB. Évolution hôte puis report source, sans CI/CD.

## What Changes

- Bouton Éditer à côté de Fermer ; formulaire dans le même overview de détail.
- Message, auteur, courriel, date avec fuseau, tag et description du tag.
- Réécriture locale du commit et de ses descendants, sans toucher aux fichiers,
  à l'index, aux autres branches ni aux dépôts distants.
- Les tags locaux concernés suivent les commits réécrits. Refus des signatures
  qui seraient invalidées, des modifications concurrentes et des noms en conflit.
