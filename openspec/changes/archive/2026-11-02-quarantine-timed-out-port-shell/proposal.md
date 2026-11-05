# Quarantiner un shell foreground expiré en conservant le verrou du port

## Problème

Un shell foreground peut démarrer un serveur puis expirer sans `shellID` ni
code de sortie. Le RUN conserve alors l’accès d’écriture du port et ne peut pas
exécuter le test browser qui doit vérifier ce serveur.

## Objectif

Après une preuve native stable de timeout, sortir l’accès du seul état de
restauration tout en conservant `-03`, `once` et le verrou d’écriture du port.
Permettre ensuite au même RUN d’acquérir un accès `read` au même port sous une
nouvelle décision CAB, afin d’exécuter le browser-check sans ouvrir le port aux
autres RUN ni permettre une écriture concurrente.

## Hors périmètre

- Déclarer le shell terminé, libérer le port ou conclure `NO_EFFECT`.
- Reconstituer un `shellID` ou un code de sortie absent.
- Rejouer `once`, répondre de nouveau à la permission initiale ou autoriser un
  accès `write` concurrent au port.

## Vérification

Les tests doivent couvrir le reçu de quarantine, la stabilité de la preuve,
l’accès read du même RUN, les refus des écritures et des RUN étrangers, la
persistance après redémarrage, et la conservation de l’opération et de son
verrou jusqu’à une fin native corrélée.
