# Suivre le cycle de vie des shells natifs en arrière-plan

## Problème

Le client CAB refuse les shells OpenCode `background=true`. Un shell foreground
qui expire peut ne fournir ni `shellID` ni code de sortie ; CAB ne peut alors
pas relier une observation globale de port à cette opération et garde l’accès
protégé.

## Objectif

Qualifier une voie native bornée pour lancer un serveur en arrière-plan,
maintenir le verrou de sa ressource pendant son exécution et ne conclure
qu’après lecture de son `Shell.Info` terminal corrélé.

## Hors périmètre

- Reconstituer rétroactivement un `shellID` ou un exit manquant.
- Fermer automatiquement un accès à partir d’un timeout, d’un port fermé ou d’une session idle.
- Modifier une opération `EXECUTING` existante ou rejouer son `once`.

## Vérification

Les tests isolés doivent couvrir start background exact, session/commande/
shellID divergents, observation RUNNING, fin native terminale, timeout,
indisponibilité de l’API shell, verrou maintenu en état inconnu et préservation
d’une opération foreground déjà `EXECUTING` sans `shellID`.
