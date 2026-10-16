# Why

Les briques CAB exposent leurs événements natifs, mais les observations MULTIRUN conservées par le job arrêté restent séparées. Les fenêtres de consultation et les preuves de couverture doivent devenir accessibles directement, sans réactiver ce job ni additionner des sources recouvrantes.

# What Changes

- Livraison source CAB 1.2.2, cohérente sur toutes les briques distribuées.
- Import local explicite, filtré et idempotent des métadonnées du job, en conservant les générations, périmètres, lacunes, preuves documentaires et relevés de quota sans identifiant brut.
- Collecte native de segments et événements horodatés pour les fenêtres glissantes ; persistance privée distincte des compteurs historiques existants.
- Vues JSON/Markdown du change courant, du dernier change livré et des dernières 24 h, 7 jours et 30 jours.
- Commandes /cab stats, /cab statslast, /cab stats 24, /cab stats7 et /cab stats30, ponctuelles et en lecture seule.
- Sources natives et importées présentées séparément, sans somme des chevauchements ni effet sur les décisions ou le gate.

# Impact

Code : modules statistiques, contrôleur, nouvel importeur et stockage d'observations, tests ciblés et distribution. Documentation : cadrages, README, CHANGELOG, commande CAB et référence du skill statistiques. OpenSpec : native-session-statistics et codex-integration-distribution.

Périmètre autonome validé : spécification puis implémentation, tests isolés, documentation, alignement 1.2.2 et archivage de ce seul change. La surveillance reste arrêtée. Aucun commit, inspection Git, déploiement, modification de services ou intervention sur les RUN actifs.
