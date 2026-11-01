# Découverte Code Mode avec acquittement littéral — 2.1.9

## Why

La qualification opérationnelle du raccord Code Mode a relevé `search({...}); return "search done";`. Ce diagnostic ne produit aucun droit, mais sa forme est refusée par 2.1.8 et empêche le prévol. La demande courante a été rejetée sans commande.

## What Changes

Compléter, dans le périmètre SCM Code Mode déjà validé, la grammaire diagnostique pour un unique search de données littérales suivi d'un retour chaîne littérale. Exiger la concordance native et ne conférer aucune autorité au texte retourné. Qualifier cette forme dans le banc OpenCode 2.2, puis distribuer 2.1.9, archiver, publier et CABU avant la reprise du même recovery.
