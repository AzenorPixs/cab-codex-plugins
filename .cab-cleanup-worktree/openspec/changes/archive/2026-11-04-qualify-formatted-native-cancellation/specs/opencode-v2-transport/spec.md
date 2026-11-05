## MODIFIED Requirements

### Requirement: Annulation exacte d’une validation imbriquée sous Code Mode

CAB MUST corréler une demande native unique et son annulation CANCELLED/OC exacte. Le wrapper MUST conserver découverte littérale puis cancel unique, arguments/identités et retour direct. Les blancs légaux hors chaînes MAY varier, sans changer tokens ou données. Double transcript, SID idle, zéro permission/accès restent requis ; aucune décision/once créée. Les diagnostics MCP prouvés sans effet MAY être ignorés comme observations, jamais utilisés comme preuve d’annulation.

#### Scenario: Wrapper Code Mode d’annulation terminale
- **WHEN** un wrapper complet non tronqué lie la demande exacte à search puis cancel_approval unique et retourne CANCELLED/OC avec toutes ses identités
- **THEN** CAB clôt la même opération sans décision, permission ou accès

#### Scenario: Mise en forme sans changement de programme
- **WHEN** espaces, tabulations ou sauts de ligne légaux hors chaînes changent sans modifier les tokens du gabarit fermé, les identifiants ou les arguments
- **THEN** CAB accepte la même preuve sans réexécuter le wrapper ni l’annulation
- **AND** les sauts de ligne après return/throw, commentaires, code ajouté ou fusion de mots restent refusés

#### Scenario: Diagnostics sans autorité avant l’annulation
- **GIVEN** un wrapper diagnostic terminé executed=false, non tronqué, avec liste non vide de calls complets limitée à search/get_approval/poll_approval/lookup_validation/broker_health/broker_readiness
- **WHEN** le transcript comporte aussi le wrapper d’annulation exact
- **THEN** CAB traite le diagnostic comme observation sans effet, sans en déduire une autorisation ou une annulation
- **AND** request_validation, cancel_approval, reject et outils mutateurs ne sont pas ignorés par cette classification

#### Scenario: Lecture terminale historique sans nouvelle annulation
- **WHEN** une lecture get_approval ou poll_approval seule expose le terminal CANCELLED/OC exact déjà acquis
- **THEN** la voie de preuve existante reste disponible sous ses contrôles de corrélation et quiescence, sans nouveau cancel

#### Scenario: Wrapper ambigu ou effet possible
- **WHEN** le wrapper est opaque, vide de métadonnées de calls, tronqué, exécuté=true, ajoute un appel ou une instruction, ou si identité/transcript/session/permission/opération diverge
- **THEN** CAB conserve l’opération protégée et n’émet aucune décision
