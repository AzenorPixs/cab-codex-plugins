## ADDED Requirements

### Requirement: Limiter le journal NO_EFFECT au watermark du tour terminal

La preuve `NO_EFFECT` MUST rester liée au tour exact et à un journal V2
synchronisé. Un événement durable strictement postérieur au watermark conservé
MUST NOT être attribué au tour antérieur. Une frontière non corrélée ou un
événement d’effet dans le tour MUST conserver `UNKNOWN`.

#### Scenario: Événement read-only postérieur sans messageId

- **WHEN** une lecture read-only ultérieure est présente dans le journal après le watermark du classement UNKNOWN mais n’a pas de messageId
- **THEN** elle n’invalide pas le tour terminal exact ; les deux lectures complètes restent identiques et l’eventLogDigest couvre le journal complet

#### Scenario: Événement non corrélé à la frontière

- **WHEN** un événement sans messageId n’a pas de séquence supérieure au watermark conservé ou sa séquence manque
- **THEN** CAB refuse `NO_EFFECT` et garde l’accès UNKNOWN

#### Scenario: Effet natif dans le tour prouvé

- **WHEN** un shell, edit, write, apply_patch ou autre outil non autorisé apparaît dans le tour assistant ciblé
- **THEN** CAB conserve UNKNOWN sans nouvel accès ni permission `once`
