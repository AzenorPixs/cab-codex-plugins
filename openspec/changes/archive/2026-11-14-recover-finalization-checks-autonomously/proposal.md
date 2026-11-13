# Révision autonome des contrôles de finalisation

Code non attribué ; attribution ACL ultérieure, sans bloquer ce correctif.

## Why
Un contrôle mal cadré peut bloquer définitivement un RUN malgré un mandat autonome.
L'incident CAB-FINALIZATION-20261113-SCM-PROMPTS a exigé une correction administrative.

## What Changes
- Réviser seulement l'argv d'un contrôle récupérable, par le codeur propriétaire,
  sur empreinte attendue et requête idempotente, sans accord intermédiaire.
- Conserver chaque version et reçu ; exiger une nouvelle preuve pour le contrôle
  révisé et préserver critères, producteurs, exigences et revue réservée.
- Exposer les actions et faits manquants de finalisation ; aucune exécution ni
  migration historique implicite. Livrer CAB3.2.5 par SCM/CI/CD et CABU.

## Impact
API/MCP/CLI communs et migration additive des révisions de contrôles.
Tests ciblés du domaine et un parcours public sur fixture ; aucun changement Web.
