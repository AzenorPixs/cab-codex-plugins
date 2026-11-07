## ADDED Requirements

### Requirement: Dépendances fondées sur le référentiel projet
Le contrôleur SHALL utiliser OpenSpec et les cadrages applicables pour les dépendances de changes, à la réservation comme à la restauration. Un historique de RUN SHALL NOT remplacer cette source. La suppression d’un RUN SHALL NOT invalider un change achevé dans OpenSpec. Codex SHALL continuer à vérifier les critères sémantiques et techniques nécessaires au travail engagé, sans confondre une adoption documentaire avec une qualification produit.

#### Scenario: Nettoyage d’un ancien RUN livré
- **WHEN** le change requis est achevé et vérifiable dans le référentiel OpenSpec
- **THEN** son retrait du runtime ne crée pas une dépendance inconnue
