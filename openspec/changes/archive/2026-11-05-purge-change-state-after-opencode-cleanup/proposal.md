# Effacement ciblé après nettoyage OpenCode

Statut : SOURCE 2.2.40 QUALIFIÉE, publication et activation séparées. Code non attribué ; attribution ACL ultérieure.
Aucune route décrite ici ne doit être supposée disponible dans CAB2.2.39.

## Demande explicite
Après une clôture sûre, supprimer les sessions OpenCode liées puis tout état
propre au change dans les briques CAB. Deux branches :
A. change métier finalisé et gate TERMINÉ vérifié ;
B. RUN arrêté/désarmé pour dépendance non satisfaite, gate BLOQUÉ vérifié et
rapport de dépendance prévu par le prompt (BLOCKERS.md pour le cycle courant).
La branche B conserve le change ouvert et ses preuves métier dans le projet.
Elle conserve aussi l’unique session métier OpenCode prévue par le prompt
applicable ; sa référence reste exclusivement dans le checkpoint métier hors CAB.
Un autre blocage technique ne devient pas une dépendance par déclaration.

## Critères d’acceptation
- aucun effet, permission, once non réconciliée, UNKNOWN/EXECUTING, accès ou
  bail actif du périmètre au début de la suppression ; un simple statut
  finalisé/BLOCKED ne lève pas ces conditions ;
- ordre strict : réconciliation → gate → désarmement/libération → nettoyage
  natif OC vérifié (avec l’exception métier de B) → purge CAB ciblée → preuve d’absence ;
- disparition des identités et contenus propres au change dans états, stores,
  journaux, reçus, stages, caches et projections des briques prises en charge ;
- aucun backup ou copie conservé par défaut après succès ;
- aucun autre RUN supprimé/réarmé, aucune permission rejouée, aucun port tué ;
- transaction reprenable, suppression idempotente, issue partielle visible ;
- réutilisation du nom fonctionnel après purge réussie, identités techniques
  neuves et compteur/époque anti-rejeu global jamais remis à zéro.

## Décision validée sur le journal commun
approval-persistence exige un journal append-only SHA256 avec checkpoint HMAC.
Retirer une ligne de la chaîne commune invalide les liens suivants. Conserver
un placeholder/hash du change laisserait une trace et n’est pas retenu par défaut.
Une purge exhaustive demande donc une exception de compactage authentifié ou
une évolution vers des journaux cloisonnés, avec migration et vérification de
préservation des événements des pairs. Ce point affecte le format et les garanties
du journal commun, au-delà de la suppression des seuls fichiers propres au RUN.
Le 5 novembre 2026, le développeur a retenu explicitement « Effacement total
avec réancrage (recommandé) ». Le retrait ciblé et le réancrage authentifié sont
donc autorisés : les payloads et identités des événements des pairs restent
identiques, tandis que leurs métadonnées de chaînage/checkpoints peuvent changer.
Aucun placeholder, backup ou tombstone identifiant la cible ne reste après succès.
Cette décision ne lève aucune précondition de clôture et n’autorise pas la purge
d’un effet inconnu. Aucune route de purge n’est encore disponible en 2.2.39.

## Livrables envisagés après cadrage
Spécification de cycle de vie, inventaire/preview typé, moteur de transaction,
adaptateurs controller/broker/supervisor/monitor, contrôle des sessions absentes,
compaction/migration de journal approuvée, tests de sûreté/reprise et contrat
skill/plugin/commande. SCM, version, commit, publication puis CABU avant usage
par le propriétaire. Aucune modification des fichiers/RUN Pixs par le correcteur.
