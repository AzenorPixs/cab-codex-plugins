## Conception

Le registre qualifie un accès unique, dédié à l’opération courante PREPARED/APPROVED, CANCELLED avant attribution, sans grantedAt, token, fencing, résultat ou quarantaine, et avec identités RUN/contexte/version concordantes. Une empreinte du même accès est contrôlée aux deux frontières et au moment du retrait ; les états HELD, RELEASED, STALE, partagés ou ambigus suivent leurs voies existantes. Le plan propose l’action mais ne la déclenche pas.

L’action conserve les gardes natives existantes : preuves fraîches, session inactive, zéro permission en attente, deux transcripts et frontières stables, contrôle des appels et absence de once. L’indisponibilité du journal reste explicite et ne vaut jamais preuve d’absence ; si l’autorité native ne suffit pas à établir l’absence d’émission, la mutation est refusée. Les reçus invalides ne sont ni effacés, ni reconstruits.
