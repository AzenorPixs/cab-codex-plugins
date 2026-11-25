## 1. Envoi Git

- [x] 1.1 Aligner les tags distants divergents sur les trois forges avec aperçu et vérification des références.
- [x] 1.2 Couvrir le premier envoi, le rejeu et un changement distant concurrent.

## 2. Artefacts

- [x] 2.1 Appliquer le style des liens des cartes et vérifier les chemins vers la Fabrique.
- [x] 2.2 Qualifier l’observation des manifestes et la répétition des publications.

## Preuves

- Les suites CAB couvrent le tag manquant, le tag divergent, le changement après aperçu, le second envoi sans push, les références Docker identiques et la vérification directe du registre.
- Chromium et Firefox vérifient le style, la confirmation et l’ouverture de la Fabrique sur les trois cartes.
- Sur pmidpoint, deux envois Git et deux confirmations pour chacune des trois forges sont observés. Le tag Git `1.0.3` est créé sur GitLab. Les deux publications Docker Forgejo et les deux publications GitHub sont confirmées. Le transfert Docker GitLab a laissé un reçu incertain lors du premier tag. Le moteur permet de réexaminer ce reçu sans émettre de transfert.
