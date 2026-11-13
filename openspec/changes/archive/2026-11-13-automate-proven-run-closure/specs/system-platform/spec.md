## ADDED Requirements

### Requirement: Évaluation et clôture automatique sur preuves
CAB MUST réévaluer les RUN après observation des sources et au démarrage.
Il MUST fermer automatiquement un RUN seulement si sa revue finale acceptée
est valide, son archive unique complète et ses effets résolus. Les périodes
ouvertes, baux, maintenance et effets inconnus MUST bloquer la clôture.
L'absence de tâches ou leur accomplissement seul MUST NOT valoir acceptation.

#### Scenario: Archive et revue valides
- **WHEN** un RUN accepté possède archive complète et preuves courantes
- **THEN** CAB produit les statistiques et le reçu de clôture, puis affiche CLOSED et étape11

#### Scenario: Preuve périmée ou effet inconnu
- **WHEN** le code a changé depuis l'acceptation ou un effet reste inconnu
- **THEN** CAB conserve les protections et expose les motifs sans rejeu

### Requirement: Services et imports réévalués sans déduction
CAB MUST distinguer état et protection d'import. Il MAY rétablir la clôture
et l'étape11 d'un import si snapshot chiffré intègre, identité et preuve terminale
concordent. La protection MUST rester conservée. Une session de service sans
preuve de fin MUST rester non clôturable ; les tâches MUST rester non applicables.

#### Scenario: Import déjà clôturé
- **WHEN** le snapshot authentifié confirme la clôture du même RUN/SID/projet
- **THEN** CAB expose CLOSED et étape11 sans retirer IMPORT_PROTECTED ni modifier les reçus

#### Scenario: Service sans preuve terminale
- **WHEN** une session service UNKNOWN n'a ni tâches ni preuve de fin
- **THEN** CAB expose service et motif non clôturable sans inventer de tâche

### Requirement: Commande visuelle de réévaluation
L'interface MUST proposer une icône Réévaluer/clôturer avec diagnostic backend.
Une clôture normale admissible MUST être directe ; une régularisation historique
MUST exiger confirmation et justification. Chaque mutation MUST revérifier
preuves et autorité côté serveur, et conserver son reçu idempotent.

#### Scenario: Conditions modifiées après affichage
- **WHEN** une protection apparaît ou une preuve change avant le clic
- **THEN** la fermeture est refusée et le motif actualisé

### Requirement: Archivage des sessions validées
CAB MUST proposer /projects/<ID PROJECT>/archives et un bouton d'archivage pour
les seules sessions CLOSED dont la clôture est prouvée. Une table dédiée MUST
conserver reçu et identité sans supprimer RUN, SID ni relations. Les sessions
archivées MUST quitter la liste courante et rester consultables dans leur projet.

#### Scenario: Session CLOSED validée archivée
- **WHEN** un utilisateur autorisé confirme l'archivage d'une session admissible
- **THEN** CAB conserve un reçu unique, préserve les liens et affiche la session dans Archives

#### Scenario: Session protégée non prouvée ou accès croisé
- **WHEN** une clôture n'est pas prouvée ou le projet n'est pas autorisé
- **THEN** CAB refuse l'archivage sans altérer les protections
