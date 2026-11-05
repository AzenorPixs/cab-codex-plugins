# Conception — nouvelle réservation après clôture

## État et décision

Le périmètre SCM et son cycle OpenSpec sont validés le 20 octobre 2026. Le défaut est reproduit sur la préparation source 1.6.3 et observé sur le runtime 1.6.2 du RUN Pixs. Les travaux de monitoring déjà présents sont conservés.

## Correction minimale

Avant `super.reserve`, appliquer les contrôles d'admission globaux dans tous les cas. Appliquer la suspension et le prévol propres au RUN seulement si sa réservation précédente est encore RESERVED. Les réservations DELIVERED ou ABANDONED sont des générations closes : `RunRegistry.reserve` conserve leurs contrôles de propriétaire et d'identité, les archive dans l'historique puis crée une nouvelle génération sans suspension héritée.

Ne pas effacer le STOP lors de la libération : il reste une preuve de la génération historique. Ne pas ouvrir RESUME sur un contexte clos et ne pas modifier manuellement le registre. Les effets non résolus empêchent toujours la libération préalable ; aucune permission ou décision consommée n'est transférée.

## Compatibilité

Aucun changement de schéma ni migration. Les RUN actifs PAUSE ou STOP restent suspendus. Un gel global bloque aussi la nouvelle réservation d'un RUN clos. Un autre propriétaire est refusé. Un change déjà livré ne peut pas être livré une seconde fois. Une ancienne génération ne peut pas autoriser une opération.

## Validation

Régressions registre : STOP/ABANDONED puis nouvelle réservation après restauration, historique et génération, refus du propriétaire divergent, suspensions actives et gel global ; STOP/DELIVERED puis nouveau change. Régression HTTP : gate BLOQUÉ, désarmement, STOP, abandon, redémarrage et réservation du même RUN/session avec nouveau job. Aucun `once` ne doit être émis par cette reprise.

Contrôles complets Node et Python, syntaxe des fichiers modifiés, cohérence des versions et du manifeste, UTF-8/LF et validation OpenSpec stricte avant archivage. Le rapport d'archive distingue ces fixtures des validations runtime et n'utilise pas la télémétrie des sessions pilotées.
