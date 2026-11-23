# Initialiser project.env dans Overview et à la création d’un projet

Code non attribué.

## Pourquoi

Un projet sans `project.env` ne peut pas être configuré depuis son Overview.
Le parcours de création possède déjà le nom et, le cas échéant, l’identifiant
public nécessaires pour initialiser ce fichier.

## Changements

- Charger l’éditeur Overview d’un projet dépourvu de `project.env` et créer ce
  fichier au premier enregistrement, sous le compte propriétaire du projet.
- Initialiser le fichier d’un nouveau projet avec le nom public, l’identifiant
  public disponible et la politique de version initiale.
- Conserver le contrôle de révision et refuser l’écrasement d’un fichier apparu
  entre la lecture et l’écriture.
