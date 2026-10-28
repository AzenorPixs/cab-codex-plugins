## MODIFIED Requirements

### Requirement: Supervision indépendante d'OpenCode
Le contrôleur SHALL surveiller OpenCode V2 via son flux d'événements HTTP SSE authentifié `/api/event` et SHALL réconcilier son état par les routes V2 authentifiées après une reconnexion, un débordement ou une divergence détectée. Une réponse HTML, une erreur 401 ou un événement non conforme SHALL NOT être interprété comme santé ou progression.

#### Scenario: Reconnexion SSE
- **WHEN** le flux SSE OpenCode est fermé
- **THEN** le contrôleur passe en reconnexion et tente une réconciliation avant de rétablir le flux
