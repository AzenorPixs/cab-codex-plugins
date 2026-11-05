## ADDED Requirements

### Requirement: Observabilité des refus de validation avant admission

Les refus HTTP de validation traités dans le contexte du job ou le contrôleur MUST alimenter le compteur de tentatives HTTP du RUN corrélé connu une seule fois par requête. Une tentative non admise MUST NOT être ajoutée aux validations indécises ni devenir une décision REJECTED. Une identité non attribuable MUST NOT inventer de propriétaire. Les corps et contenus métier MUST rester exclus de ces compteurs.

#### Scenario: Refus local et tentatives répétées
- **WHEN** une même demande reçoit plusieurs refus locaux de révision avant admission
- **THEN** chaque tentative compte une fois pour le RUN connu, sans admission, décision ou once et sans compter deux fois un même traitement

#### Scenario: Autre RUN ou admission valide
- **WHEN** le refus concerne un pair ou qu’une demande valide est admise
- **THEN** aucun refus parasite n’est attribué au RUN observé et les mécanismes d’admission existants sont conservés
