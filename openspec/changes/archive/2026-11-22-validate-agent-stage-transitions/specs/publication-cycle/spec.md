## ADDED Requirements

### Requirement: Entrée et validation d’étape par l’agent responsable
Pour les nouveaux RUN, le codeur direct ou l’orchestrateur piloté MUST annoncer en texte chaque début et chaque retour puis enregistrer l’entrée dans CAB. CAB MUST démarrer les tâches prévues à l’entrée. Il MUST accepter la validation de l’agent et l’avancement seulement après la réussite des tâches CAB du passage.

#### Scenario: Tâche de vérification en cours
- **WHEN** l’agent demande à valider l’étape pendant qu’un contrôle attendu est en cours
- **THEN** CAB conserve l’étape ouverte et affiche le retour attendu. Après réussite, l’agent valide sa part et peut avancer.

### Requirement: Réitérations et clôture contrôlées
L’agent responsable MUST pouvoir revenir à une étape antérieure en préservant les effets dont le résultat reste indéterminé. CAB MUST ouvrir une nouvelle tentative et conserver les reçus historiques. La clôture réussie MUST exiger les validations applicables, les résultats CAB réussis et la validation finale de l’agent.

#### Scenario: Retour après un échec connu
- **WHEN** un résultat échoue et l’agent revient à une étape de son choix
- **THEN** CAB distingue les tentatives et exige de nouvelles validations à partir de l’étape choisie.

#### Scenario: Rapport CAB encore attendu à la clôture
- **WHEN** un retour CAB attendu ou une preuve de clôture manque
- **THEN** CAB présente la preuve manquante et conserve le RUN ouvert.
