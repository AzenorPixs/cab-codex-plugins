# Lire les reçus terminaux historiques sans inventer un résultat

Code non attribué ; convergence ACL ultérieure. Correctif SCM demandé pour débloquer exclusivement la clôture C12 avant2.4.0. Le développeur exige les seuls tests vitaux ; grand nettoyage historique différé.

## Why
Les versions historiques (source distribuée1.10.11 examinée) validaient completeNative et persistaient COMPLETED/finishedAt/completionDigest ; nativeResult était écrit seulement pour testReservationId. Les accès étaient libérés sous les gardes de fin native. Le nettoyeur actuel exige ce nouveau champ même pour les anciens reçus déjà terminés.

## What Changes
Accepter pour l’éligibilité d’effacement uniquement un reçu legacy COMPLETED avec absence effective de nativeResult, sans bail de test, once acquittée et identité native complète, empreinte de fin valide, dates cohérentes, accès exact libéré avec outcome reconnu et empreinte de restitution. Ne pas reconstruire un exit/status natif ; conserver le format historique inchangé. Inscrire les IDs qualifiés dans le scope du certificat. Les voies actuelles et le reçu spécifique de port restent inchangés. Toute preuve partielle, effet en cours/inconnu, mauvaise liaison ou résultat explicite invalide reste refusé.

Périmètre :change-erasure.mjs, tests unitaires/intégrés, références et versions couplées. Tests ciblés strictement nécessaires, archive/SGS, DIU etCABU ; reprise du seulcleanupC12. Pas de changement des propriétaires, du gate ou de la portée.
