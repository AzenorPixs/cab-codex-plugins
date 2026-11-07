## ADDED Requirements

### Requirement: Préserver les références historiques des RUN protégés
Le lot SHALL conserver sans mutation le contenu d’un objet dont le RUN primaire est protégé et le répertoire cohérent, lorsqu’aucune identité typée ne cible l’effacement. Ses seules citations textuelles ne constituent pas des données appartenant au RUN retiré. Une identité cible typée, un RUN contradictoire ou un répertoire étranger SHALL rester soumis aux contrôles ordinaires. Les références non classées hors objet protégé SHALL rester refusées.

#### Scenario: Approbation du pair citant un ancien chemin
- **WHEN** le RUN protégé possède une approbation qui cite un chemin d’un RUN retiré
- **THEN** le contenu, sa décision et son empreinte restent identiques ; le RUN retiré est effacé

#### Scenario: Identité cible ou portée ambiguë
- **WHEN** un identifiant typé cible est présent ou les propriétaires se contredisent
- **THEN** aucune exemption de contrôle n’est appliquée
