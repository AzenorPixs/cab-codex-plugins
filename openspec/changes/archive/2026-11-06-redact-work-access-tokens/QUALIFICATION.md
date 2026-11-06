# Qualification source — CAB 2.3.8 — 6 novembre 2026

## Résultats vérifiés

- Campagne générale Node : 1420 cas, 1373 réussis, 16 échecs, 31 ignorés lors du premier passage.
- Les 16 échecs correspondaient à des attentes GET de jetons, un helper de libération récupérant le jeton par GET, des expressions de version encore en 2.3.7 et au budget documentaire. Ils ont été corrigés sans modifier les gardes métier.
- Reprise complète des trois suites affectées : 466 cas, 464 réussis, 2 échecs. Le premier est un délai de démarrage du banc avant le scénario : passe isolément 1/1 sans changement. Le second est le budget documentaire : aide raccourcie puis suite de distribution du protocole 4/4 réussie. Aucun échec restant.
- Bilan Node distinct après corrections/reprises : 1389 tests exécutés réussis et 31 ignorés. Les répétitions ne sont pas additionnées.
- Python : 193/193 réussis. OpenCode réel isolé : 2/2 réussis (deux cas ignorés dans la campagne générale).
- Bilan final distinct : 1584 tests exécutés réussis, 29 ignorés.
- Syntaxe : 130 fichiers JS/Python ; après correction des seuls helpers/attentes de tests, les deux fichiers modifiés ont été revérifiés et le gel source actualisé.
- OpenSpec strict avant archive : 22 éléments validés, aucun échec.

## Preuves fonctionnelles

GET /runs, /runs/<id>/status, /runs/<id>/locks et /coordination/global ne contiennent pas le jeton du retour POST pour les accès HELD, EXECUTING, RELEASED et restaurés. Les autres projections du contrôleur issues de la même liste utilisent la projection filtrée. Le registre persistant et ses capacités ne sont pas modifiés. La réémission identique du POST d’acquisition conserve le jeton/fencing ; la libération normale avec ce jeton réussit après la fin native. Une seule once est émise. Les réconciliations, restauration certifiée et extension additive passent avec les attentes publiques mises à jour.

Les erreurs initiales démontrent que les anciens consommateurs de diagnostic ne doivent plus chercher une capacité dans un GET. Un retour POST reste local au processus propriétaire ; une perte se traite par récupération qualifiée, sans affichage, sans fabrication d’un jeton et sans rejeu d’un effet.

## Livraison et limites

Journaux non versionnés : output/scm-access-token-redaction/. Cette SCM est directe et n’a créé aucun état CAB ; nettoyage terminal CAB non applicable. Publication prévue par DIU après archive et SGS. Le delta global peut être refusé pour contrat incompatible sans reconstruction automatique. Les services locaux restent en 2.3.6 pendant les sondes C12 ; activation 2.3.8 distincte et différée jusqu’à frontière sûre. La qualification source ne prouve pas l’activation sur le portable.
