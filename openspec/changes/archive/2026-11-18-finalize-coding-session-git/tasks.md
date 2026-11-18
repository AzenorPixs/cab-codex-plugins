# Tâches

- [x] 1. Fixer la règle sans v et ses valeurs par défaut dans les spécifications, les validations et les interfaces concernées.
- [x] 2. Indexer immédiatement les statistiques du change et le global, ainsi que BLOCKERS.md attribuable au RUN.
- [x] 3. Ajouter les reçus et le commit terminal limité aux documents, avec envois confirmés et reprise sans duplication.
- [x] 4. Intégrer cette barrière aux clôtures achevées et bloquées, avec snapshots de mesure stables.
- [x] 5. Qualifier sur l'hôte avec les contrôles ciblés, puis reporter dans le projet et la documentation distribuée.
- [x] 6. Archiver et vérifier les statistiques CAB ; livraison 3.2.17 et dernier commit terminal attestés par les reçus du moteur, avec releases DIU différées.

## Preuves ciblées

- Règle centrale sans préfixe vérifiée sur l'hôte, puis reportée aux validations, valeurs par défaut et lecteurs CABU.
- 16 tests ciblés passent ; la compilation TypeScript/Vite et la validation OpenSpec stricte passent.
- Migration additive 0037 appliquée avec le rôle migrateur prévu ; le compte applicatif accède à la nouvelle table. Aucune permission PG supplémentaire n'a été accordée.
- L'ancien comportement des RUN déjà ouverts n'est pas migré implicitement. Le présent RUN sera habilité explicitement pour qualifier la nouvelle barrière.
- Le développeur demande le déplacement automatique du tag de version sur le commit final. Le moteur le met à jour atomiquement avec la branche et vérifie les deux références sur chaque forge ; aucune mutation réelle n'a encore été exécutée pour ce correctif.

- 17 tests ciblés couvrent désormais les sorties achevée et bloquée, l'absence de double commit, le refus d'un rejeu incertain et la mise à jour atomique du tag sans v.
- La synchronisation réelle sur l'hôte a confirmé l'indexation de STATISTICS.md du présent change et du global dans un même job CAB terminé.
- Le développeur exige le déplacement du tag sur le commit terminal et son implémentation dans le code. Ce comportement est dans closure_git.py et sera qualifié par la clôture réelle de ce RUN.

- L'archivage des rapports est couvert dans les index : l'ancien STATISTICS.md actif est retiré uniquement si son contenu est confirmé comme une production CAB, sans toucher aux fichiers étrangers.

- Archivage et réconciliation du mandat réussis. Le rapport produit par CAB est présent en UTF-8/LF avec ses six sections. Le commit de code, le build et le commit terminal avec déplacement de tag seront attestés séparément par leurs reçus.
