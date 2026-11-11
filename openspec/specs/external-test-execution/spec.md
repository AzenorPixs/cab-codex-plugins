# external-test-execution Specification

## Purpose
Permettre aux agents de codage de réaliser leurs tests en autonomie sur un banc
conteneur externe déclaré, approuvé et réservé, avec credentials locaux, reçus
durables sans rejeu et revue finale corrélée aux sources.

## Requirements

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

### Requirement: Réconciliation d’un échec de prévol externe avant envoi

CAB MUST permettre une réconciliation propriétaire d’une intention externe uniquement sur preuves natives complètes d’un échec reconnu avant envoi distant. La décision MUST conserver l’intention et distinguer la coordination d’un résultat de test. L’absence de reçu ne MUST NOT suffire ; aucun faux reçu ni rejeu de la même identité ne MUST être autorisé.

#### Scenario: Prévol privé refusé avant transport
- **WHEN** l’appel unique, son empreinte, le RUN, la session, la génération, le bail, les artefacts déployés et la continuité du processus sont vérifiés sur deux observations fraîches et stables et démontrent l’erreur avant transport
- **THEN** le propriétaire peut enregistrer une clôture de coordination auditée sans déclarer de test exécuté ni restituer le bail

#### Scenario: Envoi ou identité incertain
- **WHEN** une preuve manque, les observations divergent ou une autre tentative pourrait avoir émis un effet
- **THEN** l’intention et le bail restent protégés sans rejeu

### Requirement: Diagnostic d’un effet externe non résolu

Lorsqu’une soumission est refusée en raison d’un effet externe non résolu, le broker MUST transmettre ce code précis au codeur sans exposer d’information sensible ni affaiblir le refus.

#### Scenario: Soumission avec effet externe incertain
- **WHEN** le contrôleur refuse la soumission avec `external-effects-unresolved`
- **THEN** le broker conserve ce code et aucune soumission n’est acceptée

### Requirement: Attestation immédiate du prévol externe

Le broker MUST signaler au contrôleur un échec de son état privé après premier grant et avant transport, par le canal propriétaire authentifié. Le contrôleur MUST conserver une fin de coordination auditée sans créer de reçu de test ni autoriser le rejeu de la même identité.

#### Scenario: État privé refusé après premier grant
- **WHEN** le broker authentifié établit que le contrôle privé a échoué avant tout transport et que l’identité et le bail du premier grant concordent
- **THEN** le contrôleur enregistre l’échec de prévol sans résultat d’essai et conserve le bail

#### Scenario: Grant antérieur ou réponse incertaine
- **WHEN** le grant n’est pas le premier ou que l’attestation n’est pas acquittée
- **THEN** aucune preuve rétroactive de non-émission n’est déduite et les protections applicables restent en place

### Requirement: État externe compatible avec le groupe

L'exécuteur externe MUST accepter les états détenus par son utilisateur en
0770 ou 2770, les reçus en 0770 et les anciens modes privés compatibles.
Il MUST créer les nouveaux fichiers de ce périmètre en 0770, conserver la
protection contre les liens et les autres comptes, et ne MUST NOT rejouer un
appel déjà exécuté. Un fichier d'hôtes connus en 0770 MUST être accepté si ses
autres contrôles d'identité et de contenu sont satisfaits.

#### Scenario: État normalisé sans rejeu
- **WHEN** l'état d'un appel externe est accessible en 0770 ou 2770
- **THEN** CAB peut lire son reçu et conserve la protection contre le rejeu
