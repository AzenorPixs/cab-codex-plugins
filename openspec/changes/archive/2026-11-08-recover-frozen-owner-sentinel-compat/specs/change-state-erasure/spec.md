## ADDED Requirements

### Requirement: Reprise bornée d'un propriétaire figé sur sentinelle

CAB MAY utiliser le helper 2.4.37 avec le runtime 2.4.35 uniquement pour reprendre le même reçu de lot propriétaire déjà figé et préparé. Après reconnexion, le broker 2.4.37 MAY coexister temporairement avec les services 2.4.35 pour achever et vérifier ce reçu. CAB MUST vérifier les identités, la portée, les preuves et les pairs, puis aligner les briques par CABU.

#### Scenario: Reprise du reçu préparé
- **WHEN** le reçu propriétaire de lot est figé, son issue propriétaire est incertaine et ses identités sont vérifiées
- **THEN** le helper compatible reprend ce seul reçu et conserve les RUN protégés

#### Scenario: Version ou portée différente
- **WHEN** la version ou la portée ne correspondent pas au profil qualifié
- **THEN** la reprise est refusée sans modification

#### Scenario: Broker disparu avant une issue vérifiée
- **WHEN** le broker préparé a disparu et que son dernier commit n'est pas attesté
- **THEN** CAB effectue un prévol sans mutation et ne reconnecte qu'après autorisation de l'effet potentiellement automatique

#### Scenario: Nouvelle identité non cohérente
- **WHEN** le nouveau broker ne correspond pas à l'UID et au scope attestés par le reçu propriétaire
- **THEN** la transaction reste protégée et aucune fin n'est annoncée
