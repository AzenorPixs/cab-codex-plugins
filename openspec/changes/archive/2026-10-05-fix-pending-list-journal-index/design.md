## Contexte

`do_list` appelle `repair_journal_for_item` pour toutes les approbations,
même lorsque le filtre et la limite produisent une réponse vide ou courte.
`journal_event_exists` sans index utilise `read_events`, dont la lecture
complète précède le filtrage. L'index local déjà utilisé par la récupération
initiale résout la même répétition sans changer les helpers de persistance.

## Décision

Après la sauvegarde des expirations et avant la boucle de réparation,
construire un ensemble de couples `(approval_id, event_type)` avec une seule
lecture du journal si le magasin contient des approbations. Transmettre cet
ensemble à chaque réparation. Le helper existant actualise l'ensemble après
un append durable réussi. Ne pas lire le journal d'un magasin vide.

L'index reste local à l'appel sous le verrou existant. Aucun cache global,
rotation du journal, réduction des contrôles, ni changement de timeout.
Le coût des recherches passe de lectures répétées proportionnelles au
nombre d'approbations et d'événements à une lecture initiale et des recherches
dans l'ensemble. Les append nécessaires conservent leurs propres lectures.

## Compatibilité et risques

Préserver la validation des arguments et identifiants, la sauvegarde des
expirations avant journalisation, les erreurs de lecture et d'écriture, les
contrôles de chaîne lors des append, le tri, le filtre, le compte total et
la limite. La liste ne gagne aucun nouveau contrôle d'intégrité et n'en perd
aucun. L'index consomme de la mémoire proportionnelle aux couples distincts.
Les modifications concurrentes restent régies par les verrous existants.

Aucune migration de données n'est nécessaire. Le repli consiste à restaurer
le seul parcours de liste et les alignements de cette release ; les formats
persistants sont inchangés. Le diagnostic de production est une déduction
fondée sur le code et les timeouts observés, sans profilage du broker réel.

## Validation

- Tests isolés : une lecture initiale sur un journal cohérent, dont une
  fixture représentative de 694 approbations et 16 774 événements.
- Réparations manquantes idempotentes, index actualisé après succès seulement,
  expiration sauvegardée avant append, erreurs propagées, identifiants validés.
- Filtre, tri, compte et limite inchangés ; aucun accès au journal si vide.
- Suites Python et Node, syntaxe Python/JavaScript, cohérence des versions,
  UTF-8/LF, validation OpenSpec stricte.
- Archivage du seul change et publication de son `STATISTIQUES.md`.

Le nombre de lectures est un critère déterministe ; les durées mesurées sont
informatives, sans seuil de temps fragile. Les tests utilisent des données
synthétiques dans des répertoires temporaires du dépôt, sans journal réel.
