## ADDED Requirements

### Requirement: Autorisation immuable et portée effective attestée
Le scope d’autorisation SHALL rester inchangé pour le canal propriétaire. Une portée effective MAY contenir les identifiants supplémentaires attestés par le reçu propriétaire, uniquement pour les mêmes workspace/change/RUN. Elle SHALL guider projection, statistiques et absence ; les deux scopes SHALL figurer dans le certificat. Une divergence d’identité ou la perte d’un identifiant autorisé SHALL refuser l’enrichissement.

#### Scenario: Identifiants supplémentaires du broker
- **WHEN** le broker atteste des identifiants liés au même change et aux mêmes RUN
- **THEN** ils sont couverts par la projection sans modifier le scope d’autorisation du canal

### Requirement: Candidats privés référencés et lecteurs conservateurs
Les payloads après projection MAY être stockés dans des fichiers candidats privés avec UID, type, liens, taille et SHA-256 vérifiés. Le reçu signé SHALL porter leurs références sans embarquer les payloads. Un ancien lecteur SHALL refuser avant toute écriture. Un fichier cible déjà à l’empreinte après SHALL ne pas être réécrit ; un candidat absent ou altéré nécessaire SHALL refuser l’application.

#### Scenario: Gros plan et candidat altéré
- **WHEN** le plan cumulé dépasse la borne du reçu ou un candidat nécessaire a été modifié
- **THEN** le reçu demeure borné et aucune écriture ne remplace une source depuis un candidat non vérifié

### Requirement: Compaction après preuve et retrait des candidats
Après application et absence vérifiées, le helper SHALL retirer les payloads/entries du reçu avant redémarrage, conserver les digests nécessaires et supprimer les candidats temporaires. La reprise SHALL garder le même transactionId et les contrôles avant/après ; aucun état antérieur métier SHALL être restauré.

#### Scenario: Interruption avant retrait des candidats
- **WHEN** le reçu compacté est RESTARTING et les candidats temporaires restent présents
- **THEN** la reprise les retire de façon idempotente avant remise en ligne

## MODIFIED Requirements

### Requirement: Compatibilité de reprise identifiée
Les helpers2.4.1/2.4.2/2.4.3 MAY reprendre une transaction v1 existante avec runtime2.4.0 explicite pour execute/finalize/verify ; les helpers2.4.2/2.4.3 MAY aussi recover-preparation. Les quatre versions et PID SHALL être contrôlés exactement, sans version arbitraire ni nouvel effacement. Le certificat SHALL distinguer helper et runtime ; le CABU global SHALL rester distinct.

#### Scenario: Reprise avant mise à jour globale
- **WHEN** un effacement2.4.0 reste engagé et le helper compatible est qualifié
- **THEN** le même reçu peut être terminé en vérifiant les processus2.4.0, puis le CABU global peut actualiser toutes les briques
