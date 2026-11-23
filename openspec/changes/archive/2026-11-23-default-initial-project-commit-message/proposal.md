# Message du premier commit du projet

Code non attribué.

## Objectif

Afficher « Initialisation du projet » dans le champ « Message du commit »
lors du premier commit local et utiliser ce message lorsque la demande de
création ne fournit aucun texte dans un dépôt sans historique.

## Périmètre

- Le formulaire de commit local et le défaut appliqué par le serveur CAB.
- La détection d’un dépôt absent ou sans commit, y compris après initialisation Git.
- La conservation des messages saisis et du défaut courant pour un dépôt avec historique.
