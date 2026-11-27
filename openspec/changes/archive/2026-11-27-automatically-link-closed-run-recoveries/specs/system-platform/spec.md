## MODIFIED Requirements

### Requirement: États de session anglais et concis

Les états et protections visibles dans Sessions, Archives et le détail RUN
MUST employer des libellés anglais courts. L’annulation avant exécution MUST
afficher le lien vers le RUN de remplacement.

#### Scenario: Cadrage annulé
- **WHEN** l’utilisateur consulte un cadrage annulé dans les archives
- **THEN** CAB présente Cancelled before start et le lien du successeur.

#### Scenario: Change clôturé par un RUN de reprise
- **WHEN** le propriétaire ou l’administrateur relie un RUN bloqué à une reprise livrée, clôturée sur preuves et associée au même projet, change et SID
- **THEN** la ligne Sessions et le détail du RUN bloqué indiquent que le change est clôturé et donnent accès au RUN de reprise
- **AND** l’état, le reçu et les preuves du blocage sont conservés.

#### Scenario: Liaison automatique lors de la clôture
- **WHEN** CAB scelle une reprise directe livrée et trouve un seul RUN bloqué antérieur encore sans lien pour le même acteur, projet, change et SID
- **THEN** CAB vérifie les reçus et enregistre le lien vers la reprise lors du scellement, sans appel de l’agent.

#### Scenario: Liaison ambiguë ou déjà établie
- **WHEN** plusieurs blocages antérieurs sans lien correspondent à la même reprise, ou un lien vers cette reprise existe déjà
- **THEN** CAB conserve les liens et les reçus existants et n’ajoute aucune association automatique.
