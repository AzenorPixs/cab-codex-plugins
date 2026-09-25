# Design

## Context

Le contrôleur conserve déjà les validations actives et le statut du broker,
mais `/cab stop` ne dispose d'aucun contrat technique de clôture. Voir
`proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**

- Introduire un état local de gate terminal, observable sur `/status`.
- Refuser une demande de clôture sans état terminal admissible ou avec mandat
  actif/en attente.
- Faire dépendre la procédure normale `/cab stop` de ce gate.

**Non-Goals:**

- Intercepter ou modifier le texte d'une réponse Codex.
- Décider la réussite métier, approuver un mandat ou arrêter un processus par
  force.

## Decisions

- Un endpoint local dédié reçoit l'état terminal déclaré et répond par un
  résultat de gate ; le contrôleur vérifie ses propres validations actives et
  l'état broker connu. Cette vérification locale est préférable à une simple
  instruction de prompt, car elle est appliquée hors du modèle.
- Le gate reste en mémoire et est exposé dans `/status`. Il est réinitialisé à
  la prochaine validation reçue afin qu'un ancien gate ne couvre pas un nouveau
  mandat.
- `/cab stop` doit demander le gate avant d'arrêter le service. L'arrêt forcé
  explicite du développeur reste hors de ce mécanisme.

## Risks / Trade-offs

- [Le broker ne publie pas encore de readiness récente] → le contrôleur refuse
  la clôture normale avec une raison observable.
- [Un client contourne `/cab stop`] → CAB ne peut pas empêcher un arrêt de
  processus externe ; il ne délivre toutefois aucun état de clôture valide.

## Migration Plan

La version `0.84.4` est rétrocompatible : les clients existants peuvent lire
`/status`; seuls les workflows qui demandent une clôture normale utilisent le
nouvel endpoint. Revenir à `0.84.3` supprime le gate sans migration de données.
