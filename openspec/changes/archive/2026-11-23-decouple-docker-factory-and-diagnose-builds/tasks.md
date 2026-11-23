# Tâches

- [x] 1. Découpler la construction et l’inventaire Docker des réglages de forge. Vérifier les deux tags locaux et la publication de l’image versionnée.
- [x] 2. Présenter dans l’Overview les refus et les échecs de construction. Vérifier l’ouverture automatique et la réouverture dans le navigateur.
- [x] 3. Vérifier la cohérence documentaire et la conformité OpenSpec.

## Sous-lots normalisés

- `decouple-docker-factory-and-diagnose-builds`, code non attribué, tâche 1. Configuration locale et réutilisation de l’image. Le 23 novembre 2026, `STAGE-902-9-factory-python` vérifie la construction Debian et le parcours Docker sur PostgreSQL isolé. Les appels au démon Docker et aux forges sont simulés. La recette contrôle les deux tags, l’inventaire et le passage de l’identifiant aux fonctions de publication.
- `decouple-docker-factory-and-diagnose-builds`, code non attribué, tâches 2 et 3. Diagnostic et présentation en Fabrique. Le 23 novembre 2026, les reçus `STAGE-902-9-factory-python` et `STAGE-902-9-factory-web` couvrent le refus et l’échec de construction, l’affichage du diagnostic dans Chromium et Firefox et la réouverture. Le delta et la spécification `local-web-monitor` passent OpenSpec strict. La validation globale signale trois spécifications hors périmètre.
