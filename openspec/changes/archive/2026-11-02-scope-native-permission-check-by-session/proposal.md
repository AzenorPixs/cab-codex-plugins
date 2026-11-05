# Isoler le contrôle des permissions natives par session

## Problème

Lorsqu’une opération vérifie qu’une session native est inactive, le contrôleur
chargeait les permissions de toutes les sessions de la location puis les
validait avant de filtrer la session cible. Une permission étrangère mal formée
pouvait donc faire échouer la libération de l’accès du RUN concerné.

## Objectif

Limiter la lecture des permissions natives à la session contrôlée, tout en
conservant le blocage dès qu’une permission de cette session existe.

## Hors périmètre

- Lire, répondre, annuler ou modifier une permission étrangère.
- Modifier le RUN, ses accès, décisions, permissions ou preuves.
- Réduire les vérifications d’inactivité de la session ciblée.

## Vérification

Un test doit montrer qu’une permission shell invalide d’une autre session
n’est ni lue ni modifiée et ne bloque pas la libération ciblée. Un second test
doit confirmer qu’une permission en attente de la session cible bloque toujours
la libération. Exécuter les tests applicables et la validation OpenSpec stricte.
