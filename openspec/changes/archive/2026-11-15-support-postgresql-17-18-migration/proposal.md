# Compatibilité PostgreSQL 17 et 18 et migration du cluster CAB

Code non attribué. Mandat SCM validé le 15 novembre 2026, livraison 3.2.8.

CAB doit suivre PostgreSQL fourni par Debian (17/Trixie, 18/Forky), conserver
sa référence dans /etc/cab et détecter les écarts avant toute activité métier.
Le paquet dépend de postgresql et postgresql-common. L'amorçage reste Web.

La migration du seul cluster local cab est contrôlée, sauvegardée et vérifiée.
L'ancien cluster reste conservé ; une opération indécise interdit toute reprise
aveugle. Les identités, données et reçus sont conservés. Electric reprend avec
une nouvelle photographie après migration logique. Les modifications locales
préexistantes et le delta d'interface sont inclus dans la livraison SCM.

Qualification minimale : migration réelle 17→18 en Docker, conservation des
données, refus protecteurs, reprise Electric ; activation de l'hôte sans
migration artificielle de sa base PG17, CI/CD puis CABU et clôture sur preuves.
