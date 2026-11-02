# Qualification SCM — CAB 2.2.2

## Mandat

Correctif sous SCM avec incrément, publication, CABU puis remontée aux sessions,
autorisé explicitement par le développeur. Aucun fichier du RUN Pixs modifié
manuellement. Les mandats et ressources métier restent sous leur propriétaire.

## Matrice de cohérence

| Sujet | Contrat et réalisation | Validation |
|---|---|---|
| Arrêt compatible | SIGTERM au principal avant stop du groupe, unité KillMode=mixed | régression CABU : groupe arrêté seulement après principal inactif, transfert adopté |
| Autorité | helper flock vivant jusqu’au flush et au scellement | diagnostic systemd control-group et perte d’autorité sur stop ; aucun contournement de certificat |
| Pagination | limite réduite au même curseur, retour à 200 au suivant | première page limitée à 1 puis historique 230 messages complet en moins de 12 requêtes |
| Bornes | 2 Mio/réponse, 100 pages, cycles et erreurs explicites conservés | tests du client natif et suite globale |
| Réutilisation | snapshot natif initial par session/génération, une passe | seconde lecture stable de clôture et contrôles de générations maintenus |
| Distribution | quatre briques, modules, unités, plugins et commandes 2.2.2 | tests de distribution ; cachebuster distinct |
| Livraison | archivage puis SCM/Git et CABU | publication et activation attestées après commit |

## Résultats finaux

- Node : 860 tests, 829 réussis, 31 ignorés, 0 échec ; 73 613 ms.
- Python de référence : 93/93, 0 échec.
- OpenCode réel : 1/1, 0 échec ; 9 304 ms.
- Total final unique exécuté : 923 réussites, 0 échec ; 31 opt-in ignorés.
- Campagne ciblée CABU/client : 148/148, non additionnée au total final.
- Syntaxe : 81 Node et 11 Python, 92 fichiers distincts.
- Aucun nouveau secret, paquet ou moteur de dépendance.

## Limite réelle PA01, distincte de la pagination

Lecture native filtrée complète : 6 187 messages, 64 requêtes, 63 curseurs ;
aucun transcript partiel retourné. Une demande exacte complétée est présente.
La preuve d’annulation est refusée car deux outils shell natifs du suffixe
sont en erreur. Les objets natifs indiquent error.type=aborted, executed=false,
time.ran présent. Ces seules données ne prouvent pas une absence d’effet.
Le journal session lu depuis 0 retourne un watermark 35374 mais aucun événement
tool normalisé. CAB conserve donc PREPARED/approved, sans native ni accès,
et ne fabrique ni CANCELLED terminal ni NO_EFFECT. Les propriétaires doivent
qualifier cette frontière distincte ; ce correctif n’en revendique pas la clôture.

L’échec de scellement CABU et la régression de pagination sont corrigés dans
la source. Une réussite de tests n’est pas présentée comme une activation.
