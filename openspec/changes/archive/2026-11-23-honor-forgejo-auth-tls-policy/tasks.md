## 1. Politique TLS Forgejo

- [x] 1.1 Accepter tout certificat TLS pour le profil et le dépôt Forgejo, signaler le mode TLS et invalider les résultats issus de l’ancienne politique.
- [x] 1.2 Vérifier la politique permanente de Forgejo, les politiques GitLab et GitHub et la vérification du dépôt.

## Sous-lots normalisés

### Authentification Forgejo et politique TLS

Les tâches 1.1 et 1.2 sont couvertes par le change `honor-forgejo-auth-tls-policy`. Code non attribué. La première version locale du 23 novembre 2026 utilisait un réglage explicite. Le développeur a demandé que la politique Forgejo s’applique systématiquement. La qualification porte sur cette nouvelle politique.

Le 23 novembre 2026, les huit tests d’authentification et les huit tests de métadonnées ont passé dans le venv du projet sur la politique systématique.
