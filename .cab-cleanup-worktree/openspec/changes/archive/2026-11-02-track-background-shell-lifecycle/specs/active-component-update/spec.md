## MODIFIED Requirements

### Requirement: Mise à jour forcée des services CAB

Le profil ordinaire MUST préparer et vérifier les artefacts avant coupure,
comparer empreintes et processus, puis basculer les seuls groupes nécessaires.
Il MUST préserver l'état métier sans attendre les commandes longues. Une
frontière de transfert indisponible MUST laisser l'ancienne version en service
et différer la bascule compatible. Les profils gelés et reuse-readonly MUST
conserver leurs gardes spécifiques.

#### Scenario: Jeu déjà conforme
- **WHEN** les empreintes et versions actives sont conformes
- **THEN** CABU retourne up-to-date sans arrêt, reconnexion MCP ou nouvelle récupération métier

#### Scenario: Mise à jour compatible pendant une commande
- **WHEN** une commande native est en cours et le transfert contrôlé est disponible
- **THEN** CABU prépare à chaud et bascule sans attendre cette commande ni rejouer sa permission

#### Scenario: OpenCode absent
- **WHEN** l’absence d’OpenCode est prouvée
- **THEN** les fichiers peuvent être installés et la version broker chargée reste INDISPONIBLE

#### Scenario: RUN ou coordination active
- **WHEN** des RUN, permissions ou une coordination sont actifs au début de CABU
- **THEN** la préparation continue sans attendre la fin des commandes et la bascule préserve les identités et gardes de ces opérations

#### Scenario: États CAB actifs
- **WHEN** des RUN ou une coordination sont actifs avant la mise à jour
- **THEN** leur état métier reste intact et une frontière de transfert indisponible diffère seulement la bascule

### Requirement: Redémarrage systématique et bilan explicite

Le redémarrage MUST être limité aux groupes dont les artefacts ou processus
doivent changer. Une installation de commandes ou d’instructions seules MUST
préserver les services conformes. Le bilan MUST distinguer paquet, fichiers,
versions servies, coupure et continuité vérifiée. Les sauvegardes et reçus
MUST rester disponibles pour le repli compatible.

#### Scenario: Deuxième invocation inchangée
- **WHEN** une installation terminée reste conforme sur disque et dans les processus
- **THEN** la nouvelle vérification ne redémarre aucune brique et conserve les identités des RUN

### Requirement: Coupure rapide et restauration sans notification

CABU MUST préparer les artefacts, leur fermeture d’imports, leur compatibilité
et leur reprise avant interruption. Les nouvelles validations MAY attendre
brièvement pendant la bascule ; les commandes natives déjà lancées MUST
continuer. Les demandes, décisions, accès et baux sains MUST survivre à un
transfert certifié. Une déconnexion MUST NOT devenir à elle seule un effet
inconnu. Une issue réellement incertaine MUST rester protégée sans rejeu.

#### Scenario: Coupure pendant un RUN actif
- **WHEN** CABU bascule un jeu compatible pendant la session
- **THEN** la communication reprend ses identités et acquittements sans réarmement, pause globale ou invalidation générale des baux

### Requirement: Broker actif rechargé et versions prouvées

Si les artefacts du broker changent, CABU MUST employer les routes natives
pour sa transition et vérifier une readiness fraîche portant la version cible.
Un broker déjà conforme MUST être préservé et vérifié sans reconnexion
inutile. Les services cibles MUST servir le jeu compatible attendu ; un
processus absent ou divergent MUST NOT être annoncé actif.

#### Scenario: Broker conforme et moniteur modifié
- **WHEN** seul le groupe du moniteur doit changer
- **THEN** le broker et les composants conformes restent chargés et le moniteur cible est vérifié indépendamment

#### Scenario: OpenCode lancé
- **WHEN** OpenCode est actif et les artefacts du broker changent
- **THEN** CABU effectue sa transition native et exige sa version cible et une readiness postérieure avant de conclure

## ADDED Requirements

### Requirement: Compatibilité du registre avant bascule

CABU MUST vérifier la compatibilité du lecteur cible avec l’état conservé avant
coupure. Un retour arrière MUST restaurer seulement le code compatible et
MUST NOT restaurer les RUN, décisions ou permissions depuis un ancien snapshot.
Sans repli compatible, CABU MUST conserver le reçu et proposer la récupération
en avant sans annoncer un rollback réussi.

#### Scenario: Ancien lecteur incompatible avec de nouveaux effets
- **WHEN** une reprise de code ancien ne peut pas lire les preuves conservées
- **THEN** CABU refuse ce repli et préserve le même reçu et l’état métier

### Requirement: Durée de bascule et continuité qualifiées ensemble

Les durées de préparation, interruption réelle, rattrapage et total MUST être
distinctes. La cible d’une seconde SHOULD guider la préparation hors coupure.
Un délai dépassé MUST NOT supprimer un contrôle ou prouver une fin. La
qualification MUST tester pertes de réponse, crashs aux frontières critiques,
RUN concurrents et retour automatique de communication sans effet dupliqué.

#### Scenario: Préparation longue et bascule courte
- **WHEN** les vérifications de préparation prennent plusieurs secondes
- **THEN** ces secondes ne sont pas comptées comme indisponibilité lorsque les services continuent à répondre
