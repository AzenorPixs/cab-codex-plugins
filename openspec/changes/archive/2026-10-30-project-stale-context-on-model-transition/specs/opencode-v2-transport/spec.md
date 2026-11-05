## ADDED Requirements

### Requirement: Projection portable des anciennes métadonnées après transition
Après changement de PLLM ou de compte, CAB MUST permettre d’écarter les anciennes parties de raisonnement et métadonnées fournisseur de la seule requête projetée. Les enregistrements natifs, textes utiles, contrats d’outils et permissions MUST rester conservés. La projection MUST cibler explicitement session, modèle, fournisseur, connexion opaque et anciens identifiants, sans inspection des valeurs chiffrées ni secret dans les règles.

#### Scenario: Même modèle et compte cible
- **WHEN** le compte cible refuse les anciennes métadonnées du même modèle
- **THEN** un hook natif qualifié projette les anciens messages sans ces éléments, avec même modèle et historique enregistré inchangé

#### Scenario: Portée étrangère ou connexion modifiée
- **WHEN** une autre session est traitée ou la connexion ciblée change
- **THEN** la session étrangère reste inchangée et une connexion divergente bloque la projection ciblée sans repli ni rejeu

### Requirement: Reprise après projection prouvée
Le protocole MUST préparer la projection à une frontière autorisée puis vérifier le chargement natif et un échange historique sans outil avant reprise. Une sonde neuve MUST NOT suffire. Le mode2 demandé MUST conserver sa cible et son compte ; aucune alternative PLLM, réinitialisation, compaction ou nouvelle session MUST être déduite de cette remédiation.

#### Scenario: Continuité historique réussie
- **WHEN** la cible exacte répond dans l’histoire projetée sans outil ni erreur
- **THEN** le propriétaire peut conduire le prévol CAB neuf puis reprendre les seuls mandats autorisés, sans ancienne once rejouée
