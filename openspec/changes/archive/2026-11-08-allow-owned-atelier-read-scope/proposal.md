# Lecture de l’atelier propre dans une extension compatible

## Motivation

Un RUN peut préparer des octets dans son atelier mais ne peut pas toujours ajouter leur lecture à son manifeste déjà protégé : le répertoire de l’atelier ne partage pas nécessairement le namespace de la destination. La retranscription manuelle peut altérer les octets revus.

## Changement

Autoriser dans une extension compatible la lecture de l’atelier du change et du RUN propriétaires, sous les contrôles existants de canonicalisation, propriétaire, génération, empreinte et conflits. Les écritures projet restent soumises à leurs mandats et permissions propres. Documenter le transfert exact et tester les frontières entre ateliers.

## Hors périmètre

Aucune extension d’écriture, aucun atelier d’un autre RUN, aucune modification des sessions ou des permissions natives.
