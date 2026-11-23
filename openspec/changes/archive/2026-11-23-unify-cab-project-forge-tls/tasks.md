## 1. Politique commune de transport

- [x] 1.1 Harmoniser les connexions API et Git pilotées par CAB et retirer le réglage TLS historique.
- [x] 1.2 Vérifier les trois forges avec un certificat autosigné, les lectures et envois Git et le formulaire.

## Sous-lots normalisés

### Transport API, Git et configuration

Le change `unify-cab-project-forge-tls` couvre les tâches 1.1 et 1.2. Code non attribué. Les essais utilisent un serveur TLS et des dépôts Git temporaires.

Le 23 novembre 2026, douze tests Python ont réussi. La recette comprend des requêtes API et des opérations Git sur trois dépôts temporaires avec un certificat autosigné. Chromium et Firefox ont vérifié l’éditeur et le diagnostic de rafraîchissement.
