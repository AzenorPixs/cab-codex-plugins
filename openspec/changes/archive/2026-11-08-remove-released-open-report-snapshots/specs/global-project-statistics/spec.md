## ADDED Requirements

### Requirement: Retrait ciblé d'instantanés de sessions libérées dans un rapport ouvert

SGS MUST permettre le retrait ciblé des instantanés runtime de sessions dont la
libération est prouvée, tout en préservant les sessions étrangères, les
rapports source et les statistiques globales. SGS MUST empêcher la
réimportation des mêmes instantanés sans exclure les nouveaux RUN. Une preuve
de purge MUST être délivrée et toute propriété ambiguë MUST être refusée.

#### Scenario: Session libérée et pair conservé
- **WHEN** la session ciblée est libérée et qu’un rapport ouvert contient aussi un pair
- **THEN** SGS retire l’instantané ciblé et conserve celui du pair ainsi que le fichier source

#### Scenario: Réimport et nouveau RUN
- **WHEN** le même rapport est importé après purge avec un relevé pour un nouveau RUN
- **THEN** SGS ne recrée pas l’ancien instantané et conserve le nouveau relevé

#### Scenario: Propriété incertaine
- **WHEN** la libération ou l’identité de la session n’est pas vérifiable
- **THEN** SGS refuse la purge sans modifier les données

### Requirement: Retrait explicite du rapport runtime d'un change clos

Lorsque le développeur demande le retrait de toutes les données CAB d’un change
clos, SGS MUST retirer sa copie runtime et ses agrégats, après preuve de
libération et vérification de l’absence de RUN actif. Le rapport source et les
autres changes MUST rester intacts. Les anciens relevés supprimés MUST rester
exclus lors d’un réimport du change ouvert ou archivé ; un nouveau RUN MUST
pouvoir produire ses propres données.

#### Scenario: Historique du change et nouveau RUN
- **WHEN** la copie runtime d’un change clos est supprimée puis un nouveau RUN produit un relevé
- **THEN** SGS conserve le nouveau relevé sans réimporter les relevés supprimés

#### Scenario: Même session réutilisée
- **WHEN** un nouveau RUN réutilise une session dont un ancien relevé a été supprimé
- **THEN** SGS conserve son nouveau binding et refuse d’attribuer un agrégat cumulatif non séparable à ce seul RUN

#### Scenario: Autre change ou session active
- **WHEN** une session du rapport appartient à un autre change ou que le change ciblé reste actif
- **THEN** SGS refuse le retrait et conserve toutes les données
