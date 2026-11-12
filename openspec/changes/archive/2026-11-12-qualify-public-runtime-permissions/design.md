# Conception

Après vérification SHA256 et extraction filtrée des archives publiques,
normaliser dans le staging les dossiers et fichiers réguliers, sans suivre
les liens symboliques. Les dossiers et exécutables reçoivent0755, les autres
fichiers0644 ; appliquer explicitement0755 au staging malgré l’umask.
La vérification et la normalisation précèdent le remplacement du runtime.
Les fichiers d’état privés, configurations et secrets restent hors de ce parcours.
Tests sur archives synthétiques : umask0077, import sous UID distinct,
exécution Electric factice et refus d’archive altérée.
