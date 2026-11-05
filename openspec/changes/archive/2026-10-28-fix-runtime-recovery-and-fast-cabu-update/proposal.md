# MAI09 — Fiabiliser la récupération runtime et accélérer CABU

# Why
CAB 2.0.0 peut rester actif avec un registre indisponible ; ses appels V2 ne ciblent pas toujours le workspace demandé. CABU doit réduire la coupure et restaurer les états persistants sans prévenir les RUN.

# What Changes
- Version commune 2.1.0, ciblage explicite V2, récupération du contrôleur après perte d'autorité.
- Préparation avant coupure, installation courte, redémarrage obligatoire des trois services.
- Sans notification ni modification des RUN ; aucune décision ou permission consommée rejouée.
- OpenCode actif : reconnexion native du broker et preuve fraîche de sa version. OpenCode absent : seul le broker chargé peut rester indisponible.
- Mesures de préparation, indisponibilité et total ; objectif inférieur à cinq secondes dans le banc local contrôlé.

# Capabilities
## Modified Capabilities
- active-component-update
- opencode-v2-transport
- concurrent-run-coordination

# Impact
Updater, client V2, registre/contrôleur, tests, distribution et documentation. OpenCode et les projets pilotés restent préservés.
