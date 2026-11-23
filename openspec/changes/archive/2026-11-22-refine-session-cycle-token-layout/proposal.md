# Présentation des cumuls du cycle

## Why

Les cumuls sont déjà calculés. Leur disposition et leur répétition dans Résumé gênent la lecture de la session.

## What Changes

- Intégrer le cumul de tokens de l’étape à droite des durées dans le même encadré, avec passage sous « Attente » quand la largeur ne permet plus deux colonnes.
- Dans Résumé, afficher « Totale de tous les cycles » en gras puis la durée et ses compteurs. Retirer la ligne « Total de la session ».
- Dans Informations, afficher les trois cumuls de tokens après la durée d’attente, en les diffusant avec la synthèse persistée.

## Impact

Présentation Web et projection du RUN. La table de tokens et le format natif restent applicables. Les tests vérifient les vues, l’actualisation Electric et la disponibilité des cumuls lors d’une indisponibilité du détail des étapes.
