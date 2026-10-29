## 1. Qualification et édition native

- [x] 1.1 Capturer le catalogue natif du fournisseur synthétique et qualifier l’édition partielle disponible, ask/once, refus et absence d’effet ; corriger le client seulement sur preuve, avec tests ciblés.

## 2. Supervision

- [x] 2.1 Remplacer la relance sans mandat d’un RUN piloté par une attente observable pour l’orchestrateur ; qualifier récupération, permissions, mandats et compatibilité historique sur banc isolé.

## 3. Distribution et documentation

- [x] 3.1 Aligner la version commune 2.1.10 et actualiser les consignes, cadrages, README et CHANGELOG ; vérifier la cohérence documentaire et les copies distribuées.

## 4. Extension V2 validée

- [x] 4.1 Qualifier les erreurs MCP natives avant enregistrement et permettre seulement leur retry prouvé, sans accepter un texte libre ni rejouer un effet.
- [x] 4.2 Isoler les permissions étrangères lors des vérifications d’une session, en préservant les refus stricts pour ses permissions propres.
- [x] 4.3 Normaliser les métriques natives V2 et les événements SSE utiles, avec identités validées et sans métrique reconstituée.

- [x] 4.4 Documenter et vérifier la priorité medium puis high pour nouvelles sessions/reprises, avec capacités publiées, prévol et conservation sûre du contexte.

## 5. Validation finale

- [x] 5.1 Exécuter syntaxe, tests ciblés/globaux, validations OpenSpec standard/strict et revue de périmètre ; vérifier la cohérence documentaire et l’éligibilité de l’archivage.

Après cette validation, la synchronisation/archivage natifs, STATISTICS.md et les étapes Git SCM conditionnelles restent obligatoires et tracés séparément dans QUALIFICATION.md et le bilan final.
