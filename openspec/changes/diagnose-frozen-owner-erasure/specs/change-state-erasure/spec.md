## ADDED Requirements

### Requirement: Diagnostic sans effet d'un reçu propriétaire figé

CAB MUST pouvoir diagnostiquer un reçu propriétaire figé à partir de son
périmètre authentifié sans appliquer ni répéter le commit. Le diagnostic MUST
préserver les données et restituer seulement une catégorie de contrôle et des
preuves non sensibles. Un reçu, un propriétaire ou un périmètre non vérifié
MUST être refusé.

#### Scenario: Référence étrangère
- **WHEN** un reçu figé échoue sur une référence étrangère
- **THEN** le diagnostic distingue la catégorie de contrôle sans divulguer de contenu privé ni modifier le reçu

#### Scenario: Transaction différente
- **WHEN** l’identité de transaction ou son périmètre ne correspondent pas
- **THEN** le diagnostic refuse sans effet

### Requirement: Conservation des approbations non attribuées au RUN ciblé

Lors de la reprise d'un lot historique, CAB MUST étendre les identités à partir
des objets attribués au projet ou au RUN ciblé. Une approbation dont le
répertoire est relatif et qui ne contient aucune identité du périmètre initial
MUST rester conservée ; son seul nom de change ne prouve pas son appartenance.
Une identité initiale ou un RUN cible effectivement référencé dans un objet
étranger MUST conserver la protection contre l'effacement de cet objet.

#### Scenario: Objet non attribué de même change
- **WHEN** une approbation à répertoire relatif partage le nom du change mais aucune identité initiale du RUN
- **THEN** CAB conserve cette approbation sans empêcher l'effacement des objets attribués à la cible

#### Scenario: Identité initiale liée à un objet étranger
- **WHEN** un objet étranger référence une identité initiale du RUN cible
- **THEN** CAB préserve cet objet et refuse une projection qui le modifierait

### Requirement: Reprise propriétaire bornée avec helper corrigé

CAB MAY utiliser le helper et le broker 2.4.38 avec les services 2.4.35
uniquement pour reprendre le même reçu propriétaire de lot déjà figé et
préparé. Les identités, la portée et les RUN protégés MUST être vérifiés ;
la version complète des briques MUST être alignée ensuite par CABU.

#### Scenario: Reprise compatible
- **WHEN** le propriétaire confirme le même reçu préparé et que les autres preuves concordent
- **THEN** le helper corrigé peut poursuivre ce reçu sans créer une autre transaction
