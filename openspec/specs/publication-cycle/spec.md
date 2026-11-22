# publication-cycle Specification

## Purpose

Séparer les statistiques du travail du journal opérationnel de publication et de clôture, avec chronologie PostgreSQL et vues Electric.

## Requirements

### Requirement: Cycle Publication versionné à12 étapes
CAB MUST créer les nouveaux cycles avec Initialisation/Prévol fusionnés, Analyse, Cadrage, Spécification, Versionning, Implémentation, Vérifications, Revue, Archivage, Statistiques, Publication puis Clôture. CAB MUST préserver la définition des anciens RUN.

#### Scenario: Nouvelle session et session historique
- **WHEN** un nouveau RUN est créé après activation
- **THEN** son cycle utilise Publication11 et Clôture12 ; les numéros historiques ne sont pas réinterprétés.

### Requirement: Statistiques gelées avant publication
CAB MUST inclure l'archivage dans les mesures puis figer les statistiques avant les commits, envois, générations et publications d'artefacts. CAB MUST conserver les reçus et durées opérationnels sans les ajouter aux statistiques gelées.

#### Scenario: Build et publication après archivage
- **WHEN** les mesures sont figées à l'étape10
- **THEN** les opérations des étapes11 et12 ne modifient pas leurs valeurs, même pendant leur suivi ou une reprise.

### Requirement: Projet immuable pendant Publication et Clôture
CAB MUST figer les fichiers du projet avant Publication. Les constructions MUST utiliser un espace isolé et les artefacts MUST être conservés hors des sources. Publication et Clôture ne MUST réécrire ni versions, ni code, ni spécifications, ni rapports. Une correction de source MUST revenir à l'étape de travail appropriée puis être qualifiée avant une nouvelle publication.

#### Scenario: Remédiation nécessitant une correction
- **WHEN** un build échoue et une modification de source est nécessaire
- **THEN** une nouvelle itération de travail est ouverte avant écriture ; les reçus et durées précédents sont conservés, et le temps de publication reste hors des mesures de travail.

### Requirement: Chronologie persistante avec sous-étapes et itérations
PG MUST conserver chaque passage d'étape ou sous-étape avec son début, sa fin et sa durée observés. Une réitération MUST créer un nouveau passage ; la durée cumulée et le nombre d'itérations MUST être calculés sur ces passages. Chaque cycle complet1→12 MUST posséder sa propre durée.

#### Scenario: Deux tentatives de construction
- **WHEN** une construction échoue puis réussit après reprise
- **THEN** les deux passages sont conservés, avec leurs états, horodatages et durées, et leur cumul est actualisé.

### Requirement: Vues temps réel sans données inventées
La vue session et son Overview MUST utiliser les données PG diffusées par Electric. Une étape cliquable MUST afficher ses détails, sous-étapes et itérations. Sans donnée mémorisée, la vue MUST rester vide et ne MUST pas produire de date, durée ou statut fictif.

#### Scenario: Consultation d'une étape historique sans données
- **WHEN** aucune donnée temporelle n'a été enregistrée
- **THEN** aucun détail temporel fictif n'est affiché.

### Requirement: Identité de l'artefact publié et installé
Une preuve de publication liée à CABU MUST porter l'empreinte du paquet effectivement publié et installé, et conserver séparément les preuves Git. Une correction de preuve MUST vérifier les assets distants et préserver les anciennes preuves.

#### Scenario: Tag Git et paquet Debian
- **WHEN** leurs empreintes diffèrent
- **THEN** CAB ne les assimile pas ; la preuve du paquet est établie sur les octets vérifiés de l'asset.

### Requirement: Commit local propre à la phase Statistiques
Si le parcours du change prévoit un commit, la phase Statistiques MUST committer localement les seuls rapports qu’elle a modifiés. CAB MUST vérifier leurs empreintes et conserver les autres modifications et indexations. Ce commit MUST rester distinct du commit de publication et ne MUST déclencher ni tag ni envoi distant.

#### Scenario: Rapport réécrit et BLOCKERS.md préexistant modifié
- **WHEN** la phase réécrit les deux rapports statistiques et ne modifie pas BLOCKERS.md
- **THEN** son commit contient seulement les deux rapports ; BLOCKERS.md, le code et les fichiers d'autres travaux sont conservés hors de ce commit.

#### Scenario: Change sans commit demandé
- **WHEN** la phase produit ses rapports pour un parcours sans commit
- **THEN** les rapports sont conservés localement et aucune référence Git n'est modifiée par la phase.

#### Scenario: Rapports déjà à jour
- **WHEN** le rapport du change, le rapport global et le fichier BLOCKERS.md ne sont pas modifiés par cette exécution
- **THEN** CAB ne crée aucun commit.
