## Sous-lots normalisés
Code non attribué ; repère technique bound-notification-admission-response.
Convergence définitive sous ACL ultérieure ; aucun identifiant alloué.

## 1. Transport de notification borné
Objectif : recevoir une réponse après contrôle natif dépassant2s.
Périmètre broker/copie ; dépend du transport et de la lease15s existants.
Critères :202 et refus retardés observables, expiration non autorisante.
État VALIDÉ pour le correctif ; limite de stabilité du banc dans QUALIFICATION.md.
- [x] 1.1 Dédier10s à la notification sans modifier les lectures2s.
- [x] 1.2 Tester transport réel retardé et expiration sans effet métier.

## 2. Qualification et livraison
Objectif : contrat cohérent et correctif qualifié ; dépend du1.
Critères : tests finaux figés, contrôles, OpenSpec et rapports vérifiés.
État VALIDÉ pour le correctif ; limite de stabilité du banc dans QUALIFICATION.md.
- [x] 2.1 Actualiser spécification et documentation distribuée.
- [x] 2.2 Qualifier, archiver et préparer commit/publication/CABU.
