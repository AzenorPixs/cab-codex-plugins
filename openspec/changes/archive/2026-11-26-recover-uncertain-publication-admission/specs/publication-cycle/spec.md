## ADDED Requirements

### Requirement: Réconciliation autonome d’une admission de publication incertaine

Pour les admissions d’un RUN à étape 10 vacante, CAB MUST conserver un prévol durable avant d’émettre la demande d’admission lorsque les preuves sont disponibles. CAB MUST conserver le reçu d’origine en cas d’incertitude et vérifier l’identité du RUN, la version, la portée et la révision de la livraison. Une reprise autonome MUST rester limitée à une nouvelle tentative sur le même RUN, avec sa propre référence.

#### Scenario: Livraison déjà créée

- **WHEN** le résultat de l’admission est incertain et qu’un reçu durable correspond au même RUN, à la version, à la portée et à la révision
- **THEN** CAB rattache ce reçu et suit son état sans créer de deuxième livraison

#### Scenario: Admission interrompue sans effet

- **WHEN** l’exécution de l’admission est terminée ou son worker est prouvé arrêté, aucun effet Git ou de construction et publication n’est détecté, et le prévol avant et après l’incident concorde pour les sources, les index, les références locales et distantes et la configuration de livraison
- **THEN** CAB conserve le reçu `UNKNOWN`, enregistre la preuve `FAILED_NO_EFFECTS` et admet une seule nouvelle tentative pour la même version et la même portée

#### Scenario: Preuve incomplète ou effet possible

- **WHEN** le prévol est absent ou divergent, un effet concurrent est possible ou la reprise autonome a déjà été consommée et aucun reçu compatible n’est disponible
- **THEN** CAB conserve l’incertitude et sa protection

### Requirement: Pictogramme de passage indéterminé

Dans les tableaux des douze onglets d’étape, CAB MUST accompagner le libellé « Indéterminé » d’un point d’interrogation dans un rond bleu.

#### Scenario: Passage indéterminé

- **WHEN** un passage est indéterminé
- **THEN** le pictogramme et le libellé restent visibles dans la cellule État sur une ligne
