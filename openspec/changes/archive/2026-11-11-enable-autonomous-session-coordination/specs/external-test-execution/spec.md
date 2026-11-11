## ADDED Requirements

### Requirement: Banc externe déclaré et approuvé
CAB MUST proposer un profil SSH de banc conteneur déclaré et réservé. Le profil
MUST être lié au RUN/SID, au mandat initial ou à une exception approuvée, à la
cible et au bail courant. Après cette approbation, le codeur MUST exécuter et
corriger ses essais sans validation par commande. Aucun shell hôte général,
socket arbitraire ou nouvelle allocation MUST être déduit du profil.

#### Scenario: Exception outillage approuvée
- **WHEN** un profil de banc réservé est attaché à l’exception approuvée
- **THEN** le codeur utilise la voie externe sans autorisation intermédiaire

### Requirement: Credentials locaux et cible stable
Les valeurs de connexion MUST être lues localement depuis les affectations
littérales sélectionnées de project.env, sans exécution ni restitution au modèle.
Le profil MUST référencer les noms de clés et une empreinte de configuration,
SSH MUST vérifier la clé hôte et le runner MUST vérifier le conteneur attendu.
Une cible divergente MUST être refusée avant commande. Les fichiers sensibles
MUST NOT être transférés comme artefacts.

#### Scenario: Configuration ambiguë
- **WHEN** une clé nécessaire est dupliquée ou non littérale
- **THEN** la préparation échoue avec un diagnostic fermé, sans valeur exposée

### Requirement: Reçu externe durable et reprise sans rejeu
Le transport et le runner MUST persister l’intention avant effet. Une identité
connue MUST consulter son reçu sans relancer la commande. Une réponse perdue
MUST conserver UNKNOWN ; status MUST réconcilier sur le même identifiant.
Les artefacts transférés MUST être vérifiés par empreinte et rester dans le
répertoire de travail du banc. Les résultats MUST être liés à la révision source.

#### Scenario: Réponse SSH perdue
- **WHEN** l’effet distant peut avoir commencé sans réponse terminale fiable
- **THEN** le bail et l’intention restent protégés et aucune commande n’est rejouée

### Requirement: Preuves corrélées et autonomie conservée
Un reçu externe terminal vérifié MUST fournir état, sortie expurgée, code de
retour et empreinte complète utilisables par autonomy_submit. Un exit non nul,
un résultat indisponible ou une source périmée MUST NOT devenir un test réussi.
Les autres unités indépendantes MUST rester exécutables. Une fin incertaine
MUST empêcher la restitution du banc ou une publication finale trompeuse.

#### Scenario: Résultat externe réussi
- **WHEN** le test du banc approuvé termine avec un reçu intègre et exit0
- **THEN** sa référence peut être soumise à la même revue finale que les essais locaux
