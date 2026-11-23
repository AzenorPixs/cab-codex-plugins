# Centre de notifications interactif

## Why

Le journal de livraison CI/CD encombre le bloc Git. Le déplacer dans un centre
global accessible par une cloche permanente à côté du thème de la top barre.
Conserver les notifications dans PostgreSQL, avec synchronisation Electric.
L'expéditeur est le nom du projet concerné, ou CAB pour un message global.

## What Changes

Les messages disparaissent de la base à leur première lecture et restent
consultables dans l'overview courant jusqu'à sa fermeture. Les questions à choix
restent disponibles jusqu'à réponse ; CAB conserve un reçu de décision corrélé.
Une réponse seule n'autorise aucune commande système supplémentaire.

À la demande complémentaire du développeur, le commit final porte désormais
l'identifiant du change plutôt que le libellé générique des statistiques.
