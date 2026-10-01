## Why

Le plugin CAB ne distribue pas le skill de statistiques de session et son
protocole permet de conclure après un archivage sans bilan auditable.
Le développeur demande son intégration à CAB et un rapport systématique à
l'archivage de chaque spécification, avec une release corrective commune.

## What Changes

- Embarquer `coding-session-statistics` dans le plugin `cab-approval-bridge`.
- Utiliser directement la lecture des quotas Codex, sans dépendance à Tools
  Codex ou à son skill `cgpt`.
- Préparer la collecte dès le début du job et produire un `STATISTIQUES.md`
  distinct dans chaque dossier d'archive après archivage réussi.
- Exiger la preuve du rapport avant la clôture normale ; signaler les données
  absentes sans inventer de mesure et les échecs de publication comme blocages.
- Aligner les composants distribués CAB de `0.85.1` à `0.85.2` après validation.

## Capabilities

### New Capabilities

- `archive-session-statistics`: collecte, rapport et preuve des statistiques
  obligatoires à chaque archivage OpenSpec piloté par CAB.

### Modified Capabilities

- `codex-integration-distribution`: distribution du skill dans le plugin CAB.

## Impact

Skill embarqué, protocole AGENTS/CAB, commande `/cab`, documentation,
spécifications et tests de distribution ; versions du broker, du contrôleur,
du superviseur, du plugin et de la commande. Aucun changement de transport,
décision automatique, service démarré, installation du profil, commit ou push.
