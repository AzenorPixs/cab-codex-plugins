# Conception

Le cadrage métier reste fixe. finalization.revise_check remplace uniquement argv,
avec request_id, expected_policy_digest et justification. Le propriétaire du RUN,
y compris piloté, agit sans orchestrateur ; la revue finale pilotée reste réservée.
Une transaction verrouille RUN/plan, refuse effets indécis, baux, gel, import,
revue ou clôture, et contrôle les identités et l'empreinte attendue.
Un contrôle non exécuté, échoué ou périmé est récupérable ; une preuve actuelle
réussie ne peut pas être remplacée. Les révisions sont monotones et un événement
conserve anciennes/nouvelles définitions et empreintes. Aucun reçu n'est réécrit.
La révision propre au contrôle est liée aux nouvelles preuves ; revenir à un
ancien argv ne ressuscite pas un ancien succès. Les autres contrôles conservent
leur admissibilité, selon les gardes de révision source existantes.
Le statut fournit des actions explicites : configurer, exécuter un contrôle avec
nouvel identifiant, corriger un contrôle, lire/réconcilier un effet inconnu,
attendre un producteur ou une revue, archiver le change. Il n'exécute rien.

## Validation minimale
Tests purs des invariants/actions, tests PostgreSQL ciblés des transactions et
régressions de finalisation existantes ; un parcours API réel échec/correction/
succès puis clôture automatique sur fixture dédiée. Syntaxe, OpenSpec strict,
paquet/activation et préservation des identités vérifiés dans la livraison.
