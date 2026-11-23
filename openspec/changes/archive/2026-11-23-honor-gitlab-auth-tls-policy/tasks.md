## 1. Politique TLS GitLab

- [x] 1.1 Appliquer le réglage GitLab au profil et au dépôt, indiquer le mode choisi et invalider le résultat mémorisé lors d’un changement.
- [x] 1.2 Vérifier les certificats avec et sans désactivation explicite, le repli sur le dépôt et le changement de signature.

## Sous-lots normalisés

### Authentification GitLab et politique de vérification TLS

Le change `honor-gitlab-auth-tls-policy` porte les tâches 1.1 et 1.2. Code non attribué. La vérification locale utilise un transport contrôlé. Le 23 novembre 2026, le journal du poste professionnel a signalé un échec de vérification du certificat après l’ouverture TCP.

Le 23 novembre 2026, huit tests locaux ont vérifié le magasin TLS actif par défaut, la désactivation explicite pour GitLab, le repli par le dépôt et la signature d’authentification.
