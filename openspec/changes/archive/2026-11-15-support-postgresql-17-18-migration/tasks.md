# Tâches — code non attribué

- [x] 1. Déclarer PG17/PG18 et les dépendances Debian génériques ; spécifier la référence /etc/cab et le parcours protégé.
- [x] 2. Implémenter sélection initiale, adoption et migration au démarrage et à l'installation, avec sauvegarde et conservation des preuves.
- [x] 3. Qualifier réellement 17→18 en Docker, les refus, la conservation et la reprise Electric ; valider les sources et la documentation.

Preuves du 15 novembre 2026 : `output/scm/pg328/migration-v4.log` :
52 tables, 30 séquences, données et ancien cluster vérifiés, UNKNOWN et
IMPORT_PROTECTED conservés, refus d'effet indécis, shape Electric PG18 réelle.
Python compilé et frontend TypeScript/Vite construit. Validation OpenSpec stricte : 30 éléments réussis ; revue documentaire et
syntaxe réalisées. Livraison3.2.8 et CABU sont
les exigences distinctes du contrat de finalisation du RUN SCM-PG17-PG18-328.
