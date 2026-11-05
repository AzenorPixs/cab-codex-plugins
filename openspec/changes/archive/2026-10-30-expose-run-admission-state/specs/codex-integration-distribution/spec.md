## ADDED Requirements

### Requirement: Distribution de l’observation d’admission2.1.24
Les briques CAB2.1.24 MUST distribuer l’observation et sa procédure dans skill/commande/référence. Les tests MUST couvrir refus précoce/tardif, demandes inconnues/étrangères, isolation du pair et décision unique après stabilisation. SCM/publications MUST précéder CABU vérifié puis information, sans relance implicite ou mutation de contexte.

#### Scenario: Adoption après activation
- **WHEN** la version est qualifiée et activée
- **THEN** les pilotes observent les mêmes identités et gardes sans rejouer de décision, mandat ou permission
