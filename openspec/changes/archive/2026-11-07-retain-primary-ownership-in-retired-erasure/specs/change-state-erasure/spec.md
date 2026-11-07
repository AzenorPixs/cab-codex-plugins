## ADDED Requirements

### Requirement: Priorité de la propriété primaire protégée
Dans un lot, CAB SHALL conserver intégralement tout objet dont les champs RUN concordent avec un RUN protégé et dont le répertoire est cohérent. Une collision d’identité secondaire, notamment SID historique ou identifiant de requête, SHALL NOT transférer sa propriété au RUN retiré. La collecte des identités, la projection et le contrôle d’absence SHALL appliquer cette même frontière. Les sentinelles textuelles null et undefined SHALL NOT être des identités de lot.

#### Scenario: SID et opération historiques réutilisés
- **WHEN** un contexte du RUN protégé et un contexte retiré partagent une identité secondaire
- **THEN** le contexte protégé reste identique et le contexte retiré est effacé

#### Scenario: RUN contradictoires ou répertoire étranger
- **WHEN** les champs RUN divergent ou le répertoire sort du workspace
- **THEN** les contrôles ordinaires restent applicables et aucune exemption n’est admise

## MODIFIED Requirements

### Requirement: Préserver les références historiques des RUN protégés
Le lot SHALL conserver sans mutation le contenu d’un objet dont le RUN primaire est protégé et le répertoire cohérent, sous identité primaire RUN concordante. Ses seules citations textuelles ne constituent pas des données appartenant au RUN retiré. Un champ RUN cible contradictoire ou un répertoire étranger SHALL rester soumis aux contrôles ordinaires. Les références non classées hors objet protégé SHALL rester refusées.

#### Scenario: Approbation du pair citant un ancien chemin
- **WHEN** le RUN protégé possède une approbation qui cite un chemin d’un RUN retiré
- **THEN** le contenu, sa décision et son empreinte restent identiques ; le RUN retiré est effacé

#### Scenario: RUN cible ou portée ambiguë
- **WHEN** un champ RUN cible est présent ou les propriétaires se contredisent
- **THEN** aucune exemption de contrôle n’est appliquée
