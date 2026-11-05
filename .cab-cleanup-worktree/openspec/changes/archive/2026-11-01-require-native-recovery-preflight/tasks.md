## 1. Spécification

- [x] 1.1 Spécifier discovery et permissions avant prepare, séquence stricte après gel et compatibilité d’un recovery historique déjà exécuté.
- [x] 1.2 Spécifier timeout fini de request_validation et séparation des étapes de décision/exécution.

## 2. Implémentation

- [x] 2.1 Reconnaître le retour direct `return await search(literal)` sous preuve native exacte.
- [x] 2.2 Exiger discovery request_validation et shell/edit ask avant prepare pour un RUN.
- [x] 2.3 Refuser une discovery tardive avant validation/notification et empêcher une admission après wrapper non corrélé.
- [x] 2.4 Borne request_validation et retourner le même approval ID pollable au timeout.
- [x] 2.5 Documenter le protocole uniquement dans le plugin/commande CAB, sans étendre ORCHESTRATED_CODING.md.

## 3. Vérification et livraison

- [x] 3.1 Ajouter les cas positifs/négatifs client, contrôleur, broker et OpenCode isolé (les tests natifs opt-in restent ignorés sans instance de qualification).
- [x] 3.2 Incrémenter et aligner les versions CAB/CABU en 2.1.37.
- [x] 3.3 Exécuter les tests et validations OpenSpec applicables : JavaScript 696 cas (665 réussis, 31 ignorés), Python 83/83, OpenSpec strict valide.
- [x] 3.4 Archiver le change, produire ses statistiques et actualiser les statistiques globales.

## Sous-lots normalisés

| Repère provisoire | Tâches | Objectif, périmètre et critères | État documentaire |
|---|---|---|---|
| `require-native-recovery-preflight` — code non attribué | 1.1–3.4 | Corriger le prévol de récupération CAB dans les scripts client, contrôleur et broker ; couvrir discovery/permissions, timeout fini, admission avant notification, récupération historique et documentation ; valider par tests isolés, OpenSpec strict, archive et statistiques. | VALIDÉ — 2026-11-01 ; 696 cas JavaScript (665 réussis, 31 ignorés), 83 tests Python, archive et statistiques vérifiées ; code de lot en attente du processus ACL. |
