## MODIFIED Requirements

### Requirement: SSE temps réel et contrôle CAB toutes les trois secondes

L’orchestrateur MUST traiter les changements via les événements CAB/OpenCode
dès leur réception, sans attendre une cadence fixe de trois secondes. Le
polling SHOULD servir de repli borné en cas de transport indisponible et de
réconciliation périodique de santé. Les reprises MUST conserver leur curseur
ou déclarer explicitement une lacune ; aucun événement ne vaut permission.

#### Scenario: Demande ou rapport reçu
- **WHEN** une demande corrélée arrive pendant l’analyse du codeur
- **THEN** elle est traitée dès l’événement sans pause artificielle imposée

### Requirement: Vérifications de progression espacées de sept secondes

Les vérifications MUST être déclenchées par les changements utiles et MUST
éviter les lectures répétées d’un état inchangé. Les pauses fixes de sept
secondes MUST NOT être imposées au parcours nominal. Le repli technique MUST
rester borné et distinct des échéances métier et des décisions attendues.

#### Scenario: État inchangé sans action requise
- **WHEN** la session travaille sans nouvelle demande ni anomalie
- **THEN** CAB ne sollicite pas un échange LLM ou un rapport identique à chaque intervalle fixe

#### Scenario: Demande pendant une analyse
- **WHEN** une demande CAB arrive alors que le codeur analyse ou rédige
- **THEN** l’événement est traité sans pause de sept secondes et les vérifications de santé restent indépendantes

### Requirement: Compactage coordonné des deux sessions

L'orchestrateur SHOULD compacter selon la pression native du contexte et à
une frontière sûre. Il MUST conserver mandat, checkpoint, permissions et
preuves, et vérifier les API disponibles. Un échec ou une API absente MUST
laisser continuer un contexte dont la continuité est prouvée. Un compactage
en cours ou un contexte perdu MUST suspendre les seuls effets concernés
jusqu'à réconciliation, sans rejeu ni preuve inventée.

#### Scenario: Contexte exploitable après quatre-vingt-dix minutes
- **WHEN** le contexte reste exploitable et aucune limite observée n’exige de compactage
- **THEN** le RUN poursuit ses mandats sans interruption fondée sur cette seule durée

#### Scenario: Pression de contexte à une frontière sûre
- **WHEN** une limite de contexte est observée entre deux mandats
- **THEN** les sessions accessibles sont compactées avec leurs preuves natives et le checkpoint est réconcilié avant reprise

#### Scenario: Échéance entre deux mandats
- **WHEN** la politique constate une pression de contexte entre deux mandats et les API sont disponibles
- **THEN** les deux compactages sont coordonnés et leurs preuves natives sont vérifiées avant reprise

#### Scenario: Échéance pendant une exécution
- **WHEN** une pression de contexte est observée pendant une opération autorisée
- **THEN** cette opération est conservée et le compactage attend une frontière sûre avec checkpoint

#### Scenario: Compactage de l'orchestrateur non prouvé
- **WHEN** seul le compactage de la session de codage est prouvé
- **THEN** aucune réussite conjointe n’est annoncée et la continuité des sessions accessibles détermine la poursuite

#### Scenario: Aucun compactage disponible
- **WHEN** aucune API de compactage n’est exposée et le contexte reste exploitable
- **THEN** les opérations non exécutées sont consignées et le RUN continue sans attendre une API absente

#### Scenario: Échec de compactage avec contexte préservé
- **WHEN** le compactage échoue mais la continuité est prouvée
- **THEN** le RUN continue les seuls mandats autorisés sans classement bloquant fondé sur cet échec seul

#### Scenario: Réconciliation non sûre
- **WHEN** le compactage reste actif, le contexte est perdu ou une permission est ambiguë
- **THEN** les effets concernés restent suspendus et les travaux indépendants prouvés compatibles peuvent continuer

### Requirement: Échéance suivante du compactage commun

Le prochain compactage MUST dépendre du besoin natif de contexte ou d'une
instruction explicite, sans calendrier fixe ni attente d'une API absente.
L'absence de capacité MUST être réévaluée lors d'un changement utile ou du
prochain besoin réel. Un échec MUST rester tracé sans réussite rétroactive.

#### Scenario: Échéance suivante du compactage commun
- **WHEN** un cycle de compactage commence après un retard de fin de mandat
- **THEN** la suite dépend du besoin de contexte observé sans transformer un ancien échec en réussite
