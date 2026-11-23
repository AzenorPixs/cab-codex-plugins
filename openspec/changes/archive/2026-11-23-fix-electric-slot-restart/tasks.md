## 1. Reprise Electric

- [x] 1.1 Fixer la langue des messages du rôle Electric lors de l’amorçage et de la maintenance Debian.
- [x] 1.2 Refuser un slot incompatible ou invalidé avant de relancer la réplication.

## 2. Qualification et documentation

- [x] 2.1 Vérifier le ciblage de la configuration et les états du slot.
- [x] 2.2 Qualifier la mise à jour Debian et le retour à READY avec slot conservé puis absent sur PostgreSQL 17 francophone.
- [x] 2.3 Documenter la reprise et le diagnostic.

Les reçus CAB `electric-local-tests-1` et `electric-slot-postgres17-repro-4`
établissent les contrôles ciblés et la reprise avec Electric 1.8.1 sur un
PostgreSQL 17 français isolé. Le second confirme la réception du WAL sur le
même abonnement, puis sa reconstruction quand le slot est absent.

Le 23 novembre 2026, le paquet candidat 3.18.2 construit avec la recette
Debian du projet (SHA-256 `b849252cb77320be32a4d9d2bbbee5e005b98608952d1745d4d6ad78a94458c8`)
a été installé sur la version publiée 3.18.1 dans un conteneur Debian dédié.
Les scripts `preinst` et `postinst`, le superviseur CAB, PostgreSQL 17 en
locale française et Electric 1.8.1 ont fonctionné avec le relais systemctl du
banc. La mise à niveau a conservé l’abonnement et livré son changement WAL.
La reconfiguration du même paquet après retrait du seul slot de recette a
recréé le slot et reconstruit l’abonnement. Dans les deux cas,
`dpkg --configure cab` a terminé, le reçu de maintenance est passé à
`COMPLETED` et CAB 3.18.2 est revenu à `READY`. Le conteneur de recette a
été supprimé et son absence vérifiée.
