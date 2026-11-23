# Republier les artefacts et retirer les anciennes images Docker

Code non attribué.

## Pourquoi

La publication CAB refuse un tag Docker versionné déjà présent et conserve les anciennes versions. Un paquet Debian du même nom est également conservé ou refusé sur une release existante.

## Périmètre

- Autoriser la republication sous un tag existant sur Forgejo, GitHub et GitLab.
- Sur chaque forge, retirer les anciennes versions de l’image ciblée après confirmation de la publication de la version et de `latest`.
- Remplacer le paquet Debian homonyme sur la release existante et conserver les autres pièces jointes ainsi que le tag Git.
- Appliquer les mêmes règles aux publications manuelles et aux publications natives CICD et CICDF.
- Après publication Debian confirmée, garder sept versions par paquet et architecture sur chaque forge, publication courante incluse.
