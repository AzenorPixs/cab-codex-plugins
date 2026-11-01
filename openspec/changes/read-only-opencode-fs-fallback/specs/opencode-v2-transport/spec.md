## ADDED Requirements

### Requirement: Lecture filesystem OpenCode bornée au RUN
Le contrôleur CAB MUST dériver le sessionId et le répertoire de lecture du job
armé du RUN ciblé. Les routes de lecture MUST utiliser l’API filesystem
OpenCode V2, rester read-only, et refuser toute session/location divergente,
permission native, mandat ou effet en cours.

#### Scenario: Lecture d’un fichier relatif dans la session du RUN
- **WHEN** le job est armé, la session native est idle et sans permission,
  et le chemin relatif est autorisé
- **THEN** CAB retourne le contenu UTF-8 borné et son digest, via OpenCode V2,
  sans shell, permission, écriture ou changement du registre RUN

#### Scenario: Liste ou recherche de chemins du RUN
- **WHEN** une liste ou recherche read-only est demandée avec le même RUN,
  la même session et le même répertoire
- **THEN** CAB retourne uniquement des entrées relatives filtrées et un instantané
  de la location OpenCode correspondante

### Requirement: Refus des lectures hors périmètre
CAB MUST refuser chemin absolu, `.`/`..`, sources protégées/exclues, session
native divergente, permissions présentes, RUN non armé, opération active,
réponse excessive ou données non UTF-8. Aucun refus ne MUST déclencher un
fallback vers une commande, écriture, permission ou autre location.

#### Scenario: Traversée ou source exclue
- **WHEN** la requête vise un chemin sortant ou un fichier sensible/exclu
- **THEN** elle échoue avant la lecture OpenCode et sans retourner de contenu

#### Scenario: Session occupée ou identité changée
- **WHEN** une permission native est en attente, la session est active ou
  l’identité OpenCode change pendant l’appel
- **THEN** CAB refuse la lecture et ne modifie aucun état de RUN
