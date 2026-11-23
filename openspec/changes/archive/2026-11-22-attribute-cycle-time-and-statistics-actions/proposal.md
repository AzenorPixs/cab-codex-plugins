# Attribuer les durées et détailler les actions Statistiques

## Why

Le détail mélange les durées des agents et du service. Le calcul du change et le calcul global partagent une seule action. Le bilan de blocage doit être visible seulement quand sa rédaction a été attestée dans le passage.

## What Changes

Instrumenter séparément les traitements de l’étape 10. Ventiler le temps écoulé par responsable et calculer des totaux sans double comptage. Réutiliser les passages enfants PostgreSQL et les flux Electric.
