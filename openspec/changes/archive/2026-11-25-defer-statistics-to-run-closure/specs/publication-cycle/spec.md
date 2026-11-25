## ADDED Requirements

### Requirement: Statistiques en dernières actions de Clôture
CAB MUST utiliser pour les nouveaux RUN un profil à douze étapes où l’étape 10 reste vacante. CAB MUST horodater son ouverture et sa validation vide. La Publication reste à l’étape 11 et « Clôture » à l’étape 12. CAB MUST conserver le profil des RUN existants.

#### Scenario: Passage vacant
- **WHEN** l’agent ouvre et valide l’étape 10 du nouveau profil
- **THEN** CAB conserve ses deux bornes et n’exécute aucune tâche à cette étape.

#### Scenario: Dernier tour de codage
- **WHEN** les preuves de publication et la validation finale applicable sont acquises
- **THEN** CAB attend la fin native attestée du travail de chaque rôle applicable, collecte les durées et les tokens disponibles à cette borne, puis écrit le rapport du change et le rapport global, dans cet ordre.
- **AND** le reçu de fermeture du RUN intervient après ces dernières actions, sans commit, tag ni envoi distant de clôture.

#### Scenario: Télémétrie tardive
- **WHEN** le dernier tour est encore actif ou sa borne manque
- **THEN** CAB attend la preuve de fin et conserve le RUN ouvert.

### Requirement: Rapports admissibles inclus dans la Publication
Pour un RUN du nouveau profil, CAB MUST intégrer dans le snapshot Git de toute publication autorisée les fichiers `STATISTICS.md` et `BLOCKERS.md` admissibles du projet, quelle que soit leur provenance, leur date, leur quantité ou le mandat de publication. CAB MUST vérifier la cohérence des contenus et des index entre admission et commit. Le commit de publication les propage aux forges configurées.

#### Scenario: Rapports différés sur plusieurs RUN
- **WHEN** une publication est autorisée avec des rapports du projet en attente issus de plusieurs sessions et archives
- **THEN** les rapports admissibles entrent dans le commit et ses envois aux forges pour les périmètres change et projet.

#### Scenario: Modification concurrente
- **WHEN** un rapport sélectionné change après le snapshot de publication
- **THEN** CAB refuse le commit de ce snapshot divergent avant de modifier les références.

## MODIFIED Requirements

### Requirement: Cycle Publication versionné à12 étapes
CAB MUST créer les nouveaux cycles avec Initialisation/Prévol fusionnés, Analyse, Cadrage, Spécification, Versionning, Implémentation, Vérifications, Revue, Archivage, Vacante, Publication puis Clôture. CAB MUST conserver le profil et les numéros des anciens RUN.

#### Scenario: Nouvelle session et session historique
- **WHEN** un nouveau RUN est créé après activation
- **THEN** son étape 10 est vacante, sa Publication est à l’étape 11 et sa Clôture à l’étape 12. Les passages historiques gardent leurs numéros et libellés du profil enregistré.

### Requirement: Statistiques gelées avant publication
Pour les RUN du profil précédent, CAB MUST inclure l’archivage dans les mesures puis figer les statistiques avant les commits, envois, générations et publications d’artefacts. CAB MUST conserver les reçus et durées opérationnels hors des statistiques gelées du profil précédent. Pour les nouveaux RUN, la Publication fige les sources et la collecte native continue jusqu’à la fin attestée du travail.

#### Scenario: Build et publication après archivage
- **WHEN** les mesures d’un RUN du profil précédent sont figées à l’étape 10
- **THEN** les opérations des étapes 11 et 12 ne modifient pas leurs valeurs, même pendant leur suivi ou une reprise.

### Requirement: Projet immuable pendant Publication et Clôture
CAB MUST figer les sources avant publication. Les constructions MUST utiliser un espace isolé et les artefacts MUST être conservés hors des sources. Publication et Clôture MUST préserver le code et les spécifications. Pour le nouveau profil, la Clôture peut écrire localement les rapports statistiques. Une correction de source MUST revenir à l’étape de travail appropriée puis être qualifiée avant une nouvelle publication.

#### Scenario: Remédiation nécessitant une correction
- **WHEN** un build échoue et une modification de source est nécessaire
- **THEN** une nouvelle itération de travail est ouverte avant écriture et les reçus et durées précédents sont conservés.

### Requirement: Commit local propre à la phase Statistiques
Pour les RUN du profil précédent dont le parcours prévoit un commit, la phase Statistiques MUST committer localement les seuls rapports qu’elle modifie. CAB MUST vérifier leurs empreintes et conserver les autres modifications et indexations. Ce commit reste distinct du commit de publication et ne déclenche ni tag ni envoi distant. Le nouveau profil fait l’objet de la règle de statistiques en Clôture.

#### Scenario: Rapport réécrit et BLOCKERS.md préexistant modifié
- **WHEN** la phase du profil précédent réécrit les deux rapports statistiques alors qu’un `BLOCKERS.md` préexistant a été modifié par ailleurs
- **THEN** son commit contient seulement les deux rapports et conserve les autres modifications et indexations.

#### Scenario: Change sans commit demandé
- **WHEN** la phase du profil précédent produit ses rapports pour un parcours sans commit
- **THEN** les rapports sont conservés localement et la phase préserve les références Git.

#### Scenario: Rapports déjà à jour
- **WHEN** la phase du profil précédent ne modifie aucun rapport
- **THEN** CAB ne crée aucun commit.
