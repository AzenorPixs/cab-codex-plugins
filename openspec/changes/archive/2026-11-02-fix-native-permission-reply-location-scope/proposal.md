# Corriger le scope de location des réponses de permission native

Code de lot : non attribué — identifiant technique provisoire.

## Problème

Le client CAB reçoit le répertoire de la session lorsqu’il répond à une
permission native, mais la requête V2 n’applique pas ce répertoire comme scope
HTTP. Elle hérite alors du répertoire par défaut du client. Une permission
trouvée dans une autre location peut rester en attente, alors que l’opération
CAB demeure protégée comme non résolue.

## Objectif

Adresser `once`, `always` et `reject` à la location exacte fournie pour la
session ciblée, sans changer la décision, les gardes de permission, ni les
contrôles de fin de l’opération native.

## Critères d’acceptation

1. Une réponse de permission transmet à la requête HTTP le scope de location
   exact passé au client, même si celui-ci diffère de sa location par défaut.
2. L’endpoint V2, le corps de décision et l’exigence HTTP 204 restent inchangés.
3. Un scope absent ou invalide est refusé avant la requête réseau.
4. Les tests isolés couvrent les locations divergentes et le refus d’un HTTP
   autre que 204 ; ils ne démarrent ni ne modifient une session utilisateur.
5. Le correctif source ne répond à aucune permission ni opération déjà en
   attente ; leur réconciliation reste séparée.

## Périmètre

- Module client OpenCode V2 et test unitaire isolé du scope de la réponse.
- Exigence de transport OpenCode V2 mise à jour.
- Skill CAB et commandes CAB/CABU maintenus cohérents avec la réponse scoped.
- Version commune CAB/CABU incrémentée, documentation de distribution et
  changelog alignés.

Hors périmètre : réponse manuelle ou automatique à une permission existante,
rejeu d’un effet, changement de configuration OpenCode, arrêt d’OpenCode,
modification de session/RUN, assouplissement d’une garde, ou attribution d’un
code de lot.
