## ADDED Requirements

### Requirement: Retraite historique non exécutable
CAB SHALL permettre le retrait propriétaire d’une opération PREPARED/REJECTED
de génération antérieure dans le même RUN et contexte, sous identité persistée
exacte, ressources couvertes et autorité courante. Le retrait MUST NOT créer
une opération, once, accès ou résultat et SHALL conserver la décision et la
génération historiques. Native, résultat, once ou accès lié SHALL interdire
cette admission historique.

#### Scenario: Génération étendue après rejet
- **WHEN** un rejet jamais émis de génération N est retiré sous autorité N+1 avec deux frontières natives stables
- **THEN** seule sa coordination devient CANCELLED et les identités restent inchangées

#### Scenario: Identité étrangère ou émission
- **WHEN** le contexte, propriétaire ou digest divergent, ou un effet est lié
- **THEN** CAB refuse sans modifier les protections

### Requirement: Preuve de retrait corrélée au mandat
Le retrait SHALL qualifier un unique call cible par entrée native, contenu,
identité et reçu de rejet exact. Dans une frontière comportant des calls candidats, les appels indépendants SHALL être exclus
seulement sous corrélation persistée et preuve native terminale vérifiée.
CAB MUST NOT tronquer le transcript au prochain mandat ou ignorer un appel
ambigu ; les deux frontières complètes SHALL rester stables.

#### Scenario: Plusieurs mandats successifs
- **WHEN** un call refusé exact est suivi d’appels de mandats indépendants terminalement prouvés
- **THEN** le retrait cible est admissible sans modifier ces autres opérations

#### Scenario: Candidat ou mandat ambigu
- **WHEN** plusieurs calls cibles ou un appel non attribué restent présents
- **THEN** le retrait reste refusé

### Requirement: Réconciliation de port après reboot noyau
Une opération locale de port en timeout SHALL pouvoir être réconciliée après
preuve d’un reboot du noyau strictement postérieur au call historique, sous
revue existante, deux sondes natives complètes et fraîches du port/processus,
identités/espaces courants concordants et doubles frontières stables. CAB MUST
conserver le résultat historique inconnu et MUST NOT substituer un ancien PID.

#### Scenario: Reboot qualifié et ressource quiescente
- **WHEN** les captures natives prouvent le même reboot postérieur au timeout et les deux sondes prouvent la quiescence
- **THEN** le reçu indique HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT sans résultat historique fabriqué

#### Scenario: Simple changement de processus ou preuve partielle
- **WHEN** seul le PID change, le reboot précède le call, une capture diverge ou un listener/processus reste actif
- **THEN** CAB conserve la protection et refuse la réconciliation

### Requirement: Sondes du SID courant sur un port historique
Après preuve de reboot, le contrôleur SHALL pouvoir préparer une sonde exacte
pour le SID courant du même RUN/contexte. Seul son mandat neuf explicitement
approuvé, limité à la lecture du port, SHALL traverser la quarantaine ancienne.
La préparation SHALL lier commande, nonce, cible, session et empreinte de
l’opération historique. Les autres lectures inter-SID SHALL rester refusées.

#### Scenario: SID source historique révoqué
- **WHEN** le contrôleur prépare le probe de reboot exact et le SID courant l’exécute sous nouveau mandat et once
- **THEN** les deux captures sont vérifiées dans le SID courant et les preuves historiques restent dans leur SID source

#### Scenario: Commande ou identité différente
- **WHEN** la commande, ressource, nonce ou SID ne correspond pas à la préparation exacte
- **THEN** aucune compatibilité de lecture de la quarantaine n’est accordée


### Requirement: Séquence native rejetée sans call cible
Pour une préparation rejetée jamais émise, CAB SHALL pouvoir qualifier la
séquence native depuis request_validation jusqu’au rejet exact observé et
à sa fin stop postérieure à la décision durable. Les parents natifs, sessions,
messages, dates et le message utilisateur suivant SHALL être vérifiés. Tout
call environnemental dans cette séquence ou enfant tardif de ses parents SHALL
interdire cette preuve.

#### Scenario: Attente puis rejet dans une continuation native
- **WHEN** les échanges request/get/poll de même identité se terminent après le rejet durable sans call environnemental
- **THEN** seule la coordination rejetée est retirée et les messages ultérieurs restent inclus dans les empreintes

#### Scenario: Effet pendant l’attente ou source incomplète
- **WHEN** un call environnemental précède le rejet observé, la parenté diverge, une fin manque ou une frontière change
- **THEN** CAB conserve la préparation et ses protections sans inventer de preuve de rejet

### Requirement: Conservation du suffixe après preuve de rejet
Le transcript complet SHALL rester scellé sur les deux frontières de retraite.
Les effets des séquences ultérieures MUST NOT être déclarés sans effet ni
perdre leurs protections par le retrait de la coordination rejetée.

#### Scenario: Activité ultérieure indépendante
- **WHEN** le retrait qualifie une séquence rejetée close suivie d’autres échanges
- **THEN** le reçu conserve les empreintes du suffixe et ne modifie aucune autre opération ou protection
