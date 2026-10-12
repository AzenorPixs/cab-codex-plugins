## Décision validée
Après un prévol divergent refusé sans effet, conserver la session candidate dans laquelle le prévol a divergé. Ne pas revenir à la session ancienne révoquée, ni créer une autre session, un autre job ou purger. Le transfert initial reste prepare puis complete.

## Retry explicite
POST /job/recover accepte phase retry avec les cinq champs existants, recoveryId inchangé, sessionId candidate inchangé, preflightRequestId neuf et previousPreflightRequestId égal à la réservation courante. Les mêmes préconditions techniques s'appliquent. Toute tentative antérieure doit être explicitement refusée et non consommée. L'historique natif doit montrer un refus REJECTED corrélé à une décision locale rejected ou une erreur MCP -32602 avant enregistrement. Timeout, erreur générique, APPROVED, commande ou autre outil natif interdisent retry. Le contrôleur ne compare pas un paramètre non prescrit à une valeur inventée.

Après contrôle, persister les identifiants des essais précédents et une empreinte SHA-256 du préfixe des parties tool natives. Aucun contenu de message n'est persisté. À chaque retry et complete, ce préfixe doit rester identique. Les nouvelles preuves sont vérifiées seulement après cette frontière ; changer, perdre ou réordonner les anciennes preuves conserve le gel. Les validations et décisions historiques restent inchangées ; les anciens requestId et approval_id ne peuvent pas être réutilisés. Les preuves locales perdues après redémarrage ne sont pas reconstituées implicitement.

Un retry garde gel, gate OPEN, job, critères, jalon, strictCommands et sessions révoquées. Le superviseur reste suspendu jusqu'à complete. Le nouveau prévol exige /usr/bin/true exact, décision explicite, réponse MCP APPROVED, permission once, exit 0 puis READY pending_count 0. La reprise métier reste au premier jalon non prouvé sans rejeu.

## Validation et limites
Tests HTTP simulés : refus puis retry réussi dans la même candidate, preuves natives conservées, identifiants périmés, timeout, effet consommé, demandes en attente, préfixe altéré, concurrence et restauration. Suites Node/Python, syntaxe, validation du skill, versions, UTF-8/LF, OpenSpec strict ciblé avant code puis canon final comparé à la baseline (13 WARNING historiques, zéro ERROR).
SCM direct sans skill de statistiques pilotées. Archivage de ce seul change et rapport six sections avec N/A motivés. L'intégration réelle et l'installation restent non exécutées.
