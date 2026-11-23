# Uniformiser la popup et effacer les messages

## Motivation

La fenêtre de notifications change de hauteur selon le message. Les
administrateurs doivent disposer d’une commande pour vider les messages de
tous les projets depuis cette fenêtre.

## Changements

- Garder les dimensions de la popup stables pour une même fenêtre de navigateur.
  Faire défiler le contenu long entre l’en-tête et les commandes.
- Ajouter **Effacer les messages** immédiatement après la flèche suivante.
- Purger les messages de `cab_notifications` pour tous les projets. Conserver
  les questions et les reçus existants.

## Impact

Centre Web des notifications et API administrateur. Les données purgées sont
supprimées définitivement. Le schéma de la base reste compatible avec les
installations existantes.
