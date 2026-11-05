# MOD04 — Utiliser medium comme raisonnement automatique par défaut

## Pourquoi

Le défaut CAB actuel choisit high puis xhigh. Les sessions de codage doivent
demander medium par défaut et distribuer cette règle dans le jeu CAB 1.10.6.

## Changement

- conserver la priorité d'un niveau de raisonnement explicitement fourni par
  le prompt ;
- choisir medium lorsqu'aucun niveau n'est explicitement fourni ;
- exiger le prévol exact et conserver le niveau choisi pendant les reprises ;
- incrémenter les versions des sources distribuées de 1.10.5 à 1.10.6 sans
  modifier les services, installations, caches ou RUN actifs.

## Impact

Les nouveaux jobs automatiques utilisent medium si le modèle le prend en
charge. Une incompatibilité prouvée fait examiner la candidate PLLM suivante.
Un modèle explicitement imposé qui ne prend pas en charge le niveau requis
reste bloqué. Les jobs déjà armés conservent leur choix.
