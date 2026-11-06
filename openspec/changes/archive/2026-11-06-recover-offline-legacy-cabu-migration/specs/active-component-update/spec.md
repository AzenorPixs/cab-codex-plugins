## ADDED Requirements

### Requirement: Prévol du lecteur cible sur état legacy
CABU SHALL valider les états applicables avec le lecteur cible dans une copie
isolée avant bascule, même si le contrôleur ancien est indisponible. Il SHALL
conserver les sources et vérifier l’inventaire avant et après copie. Un schéma
inconnu ou une couverture incertaine SHALL refuser la migration sans purge.

#### Scenario: Ancien lecteur refusant un registre compatible avec la cible
- **WHEN** le contrôleur ne répond pas et les fichiers legacy sont acceptés par le lecteur cible isolé
- **THEN** CABU prépare une migration privée protégée sans changer les identités, décisions ou opérations

### Requirement: Reprise du reçu historique sans nouvelle transaction aveugle
CABU SHALL réutiliser le reçu non terminal vérifié et ses artefacts exacts.
Il SHALL achever sa cible historique avant toute nouvelle transaction. Toute
étape supplémentaire vers un paquet plus récent SHALL être annoncée comme
distincte après clôture vérifiée. Les effets incertains SHALL rester protégés.

#### Scenario: ROLLBACK_FAILED après migration omise
- **WHEN** le stage et les sauvegardes du reçu sont intègres et la migration offline est vérifiable
- **THEN** CABU reprend ce même identifiant et vérifie la cible avant de clore le reçu

### Requirement: Repli fidèle à l’activité initiale des services
Le repli SHALL restaurer l’activité initialement observée de chaque service.
Il MUST NOT démarrer un service initialement arrêté pour vérifier une version.
Une erreur de repli SHALL exposer son code filtré sans masquer la cause initiale.

#### Scenario: Trois services arrêtés avant mise à jour
- **WHEN** une installation échoue et CABU revient aux fichiers précédents
- **THEN** les trois services restent arrêtés et le repli vérifie cet état sans démarrage
