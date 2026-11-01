# CO02 — Réduire l'exclusion d'intégration — premier lot validé

## Pourquoi

La clôture documentaire ne doit pas prolonger la barrière globale. Deux appels
séparés de libération et de closing exposent un intervalle de concurrence ; les
contrôles natifs répètent aussi les mêmes lectures globales par session.

## Changements

- Définir préparation, fenêtre critique et clôture documentaire distinctes.
- Ajouter une publication/libération/entrée en REPORT atomique et idempotente.
- Préparer avant la file FIFO, rejoindre le prochain jalon stable prouvé et
  exposer les obstacles techniques sans déduire la qualité métier des preuves.
- Regrouper les observations natives et refuser toute observation divergente.
- Vérifier sources, protocole, compatibilité, reprise et archivage local SCM.

## Périmètre et autorisation

Premier lot, propositions 1 à 4, validé par le développeur le 16 octobre 2026.
Les écritures OpenSpec, l'implémentation, les tests et le cycle SCM jusqu'à
l'archive sont autorisés. Aucun déploiement, appel aux services actifs, changement
de version publiée, opération Git ou propagation vers un autre projet.
Les instantanés immuables et les écritures concurrentes sous exclusion sont exclus.

## Impact

API historique conservée ; les reçus atomiques utilisent le registre schéma 3,
lisible par les nouvelles sources avec les schémas 1/2. Une ancienne distribution
ne doit pas charger un état schéma 3. Aucun état existant n'est migré ici.
