## Context

Le contrôleur publie son API de décision selon le `requestId`, conformément au
contrat existant. Le broker conserve aussi cet identifiant, mais construit
actuellement son URL de lecture avec l'identifiant technique `approval_id`.
Voir `proposal.md` pour la motivation et les deltas de spécification pour le
contrat cible.

## Goals / Non-Goals

**Goals:**

- Employer le `requestId` comme clé unique de transport entre broker et
  contrôleur.
- Faire porter à la décision restituée les trois identifiants contrôlés par le
  broker.
- Ajouter une régression qui prouve le flux avec des identifiants différents.

**Non-Goals:**

- Modifier le transport MCP stdio, les états métier ou la persistance du
  broker.
- Ajouter des dépendances ou un service réseau supplémentaire.
- Traiter les approbations déjà bloquées avant le déploiement.

## Decisions

### Le `requestId` est la clé de route de décision

Le broker interrogera `GET /decision/<requestId>`. C'est la clé du contrat HTTP
et l'identifiant métier stable ; `approval_id` reste une clé interne du magasin.
Utiliser `approval_id` pour la route est rejeté car il contredit le contrat et
empêche le contrôleur de retrouver sa décision.

### Le contrôleur propage les identifiants notifiés

Le contrôleur conservera `requestId`, `approval_id` et `change_id` avec chaque
demande en cours. Lorsqu'une décision automatique ou manuelle est restituée,
il y ajoutera ces valeurs. Le broker vérifiera alors explicitement les trois
valeurs avant application. Une réponse sans identité complète est rejetée,
plutôt que de s'appuyer uniquement sur la route HTTP.

### Le test de régression isole le contrat HTTP

Les tests lanceront le contrôleur avec un faux App Server, notifieront une
demande où `requestId` diffère d'`approval_id`, injecteront une décision et
vérifieront son accès par `requestId`. Un test Python du broker vérifiera que
l'URL de lecture et l'application attendent ces mêmes identifiants.

## Risks / Trade-offs

- [Décisions précédemment mémorisées sans identifiants] → les décisions sans
  identité complète sont désormais refusées ; aucune approbation ambiguë ne
  sera appliquée.
- [Régression de compatibilité avec un contrôleur ancien] → le déploiement du
  broker et du contrôleur doit être atomique ; le test E2E CAB est requis avant
  activation.

## Migration Plan

1. Déployer ensemble le broker et le contrôleur corrigés.
2. Redémarrer le contrôleur géré par CAB et vérifier `broker_readiness`.
3. Exécuter `/cab test` avec des identifiants distincts.
4. En cas d'échec, revenir aux versions couplées précédentes sans appliquer de
   décision en attente.
