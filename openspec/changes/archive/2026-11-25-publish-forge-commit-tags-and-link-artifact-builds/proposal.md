# Publier les tags du commit et relier les artefacts aux constructions

## Pourquoi

Sur pmidpoint, GitLab a reçu le commit de la branche sans son tag local `1.0.3`. Les cartes des trois forges affichent aussi des métadonnées d’artefact alors que l’information attendue est le tag de la dernière publication et l’accès à sa construction.

## Changements

- Envoyer avec la branche les tags du commit confirmés et absents de la forge. Vérifier les références distantes et refuser tout écrasement de tag.
- Afficher la dernière publication Debian et Docker par ses tags et ouvrir le détail de la construction correspondante lorsqu'un reçu existe.

## Impact

Envoi manuel et affichage des cartes Forgejo, GitHub et GitLab. Contrats OpenSpec et tests associés. Le parcours de synchronisation bidirectionnelle reste disponible pour l’ensemble des tags.
