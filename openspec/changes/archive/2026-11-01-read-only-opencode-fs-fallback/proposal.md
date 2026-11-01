## Why

Une session OpenCode peut ne pas exposer l’outil natif `read`/`search`, même
quand son mandat n’autorise que ces opérations. L’agent ne doit pas basculer
vers `shell`, `execute`, `edit` ou `write` pour contourner cette absence. Sans
autre chemin sûr, les lectures de cadrage deviennent bloquantes.

## What Changes

Ajouter au client CAB des appels read-only aux routes filesystem natives
OpenCode V2, bornés à la session et au répertoire d’un RUN. Exposer au pilote
des routes controller pour lire un fichier, lister un dossier et rechercher
des chemins, plus un helper CLI local. Les chemins restent relatifs, les
sources sensibles/exclues sont refusées, les réponses sont bornées, et les
appels ne créent ni permission ni effet métier.
