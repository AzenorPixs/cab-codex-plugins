## Context

Electric crée ou reprend le slot logique persistant `electric_slot_default`. En cas de collision, la version 1.8.1 attend le message anglais de PostgreSQL en plus de SQLSTATE `42710`. La locale du processus Electric est indépendante de celle du serveur PostgreSQL.

## Decisions

- Réutiliser l’administration PostgreSQL existante pour fixer `lc_messages=C` au niveau du couple rôle Electric et base CAB. L’opération est idempotente et la locale du cluster continue de s’appliquer aux autres connexions.
- Inspecter le slot de ce nom avant la maintenance Debian sur une base initialisée. Une incohérence de base, de plugin, de type, de persistance ou une invalidation arrête la maintenance avec un diagnostic stable.
- Déléguer à Electric la création d’un slot absent. Le client reçoit la resynchronisation prévue par le protocole Electric si sa position précédente devient inutilisable. CAB ne supprime ni slot ni stockage pour traiter une collision.

## Qualification

Dans un conteneur isolé, observer le slot, le handle et l’offset avant la mise à jour. Écrire une modification après l’arrêt d’Electric, puis vérifier la réception de cette modification après configuration du paquet. Vérifier séparément la recréation et le nouvel instantané quand le slot manque.
