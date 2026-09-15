## Context

Le contrôleur possède déjà l'endpoint local `POST /decision/<requestId>`, mais
il déclenche simultanément une décision automatique par un tour Codex. Cette
course peut produire un refus avant que l'orchestrateur de la session ne
transmette sa décision explicite.

## Goals / Non-Goals

**Goals:**

- Permettre au contrôleur de conserver un mandat PENDING pour décision manuelle.
- Préserver la corrélation et la consommation unique d'une permission native.
- Conserver le mode automatique existant comme option explicite.

**Non-Goals:**

- Modifier le broker MCP, le protocole de permission OpenCode ou l'interface réseau.
- Autoriser une décision non corrélée ou une seconde décision.

## Decisions

- Ajouter `OC_Codex_DECISION_MODE` avec les seules valeurs `automatic` et
  `manual`; une valeur absente utilise `manual` afin que l'orchestrateur
  conserve la décision corrélée de chaque mandat.
- En mode manuel, enregistrer la validation puis ne pas appeler `decide()`;
  l'endpoint de décision existant reste l'unique voie pour conclure le mandat.
- Refuser le démarrage avec une valeur de mode inconnue plutôt que de choisir
  silencieusement un comportement.

## Risks / Trade-offs

- [Mandat manuel non décidé] → il reste PENDING, conformément au refus par
  défaut, et les watchdogs existants le signalent.
- [Erreur de configuration] → validation au démarrage et maintien du mode
  manuel comme défaut sûr.

## Migration Plan

1. Déployer le contrôleur mis à jour sans variable : le mode manuel devient le
   comportement par défaut.
2. Définir `OC_Codex_DECISION_MODE=automatic` uniquement lorsqu'une décision
   automatique est explicitement souhaitée.
3. Retirer la variable pour revenir au mode manuel.
