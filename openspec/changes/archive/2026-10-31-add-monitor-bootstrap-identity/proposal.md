# Projection d’identité minimale pour le bootstrap CAB Monitor

Code de lot non attribué ; attribution ACL ultérieure.

## Why

Le bootstrap obligatoire de `/CAB start` lit `/api/snapshot` uniquement pour
vérifier la version du moniteur et son workspace. Ce snapshot sert aussi au
tableau de bord et contient les vues normalisées de plusieurs RUNs et changes ;
le bootstrap ne devrait pas transmettre ces données au modèle.

## What Changes

Ajouter `GET /api/identity`, une projection locale en lecture seule contenant
uniquement la version du moniteur et `identity.workspace`. Faire utiliser cette
route au bootstrap obligatoire de `/CAB start`. Conserver `/api/snapshot` et
SSE pour l’interface de supervision et ses vérifications internes.

## Acceptance Criteria

- La réponse de `/api/identity` expose seulement la version et le workspace
  canonique configuré ; elle ne contient aucune donnée de RUN, change,
  session, événement ou source.
- L’endpoint applique les gardes loopback/origine et la méthode GET, et reste
  disponible sans contrôleur ni superviseur.
- Le bootstrap `/CAB start` vérifie la version et le workspace via la réponse
  minimale puis vérifie la page locale ; il ne lit plus le snapshot complet.
- Le tableau de bord garde son snapshot multi-RUN existant.
- Les versions CAB/CABU et composants communs sont alignées sur `2.1.34`.

## Out of Scope

Aucune modification des données du registre, du contenu du snapshot utilisé
par le tableau de bord, des RUN/leases, des services actifs ou de la
configuration OpenCode. L’activation runtime est une étape distincte.
