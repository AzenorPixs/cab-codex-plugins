# Entretien des anciens RUN fermés — CAB2.4.5

Le développeur peut demander le retrait des états d’exécution devenus inutiles,
en nommant les RUN/chats à conserver. L’orchestrateur rapproche les chats Codex
ouverts, checkpoints et registre CAB. Un chat non chargé n’est pas un chat fermé.
La liste explicite du développeur prévaut ; conserver aussi un RUN qu’il nomme
sans chat associé. Ne pas supprimer ou archiver les chats Codex pour nettoyer CAB.

Préparer un inventaire daté et ses empreintes dans le dossier de suivi autorisé.
Les RUN en cours et ceux protégés restent exclus, même s’ils sont BLOCKED ou
ABANDONED. La réservation actuelle n’est pas réouverte, renommée ni fabriquée.
Le nettoyage ne modifie pas les décisions métier de leurs contextes historiques.

## Lot explicite

La même CLI cleanup accepte prepare avec ce JSON sur son input privé :

```json
{"mode":"retired-runs-v1","runIds":["run-ferme"],"protectedRunIds":["run-a-garder"],"ownerId":"orchestrateur","evidence":["preuve-du-mandat-et-inventaire#sha256=..."]}
```

Le contrôleur vérifie tous les contextes et aliases historiques des RUN choisis,
leurs jobs désarmés et gates terminaux validés, et l’absence de ressources non
soldées. Tout RUN RESERVED, inconnu, protégé, d’un autre projet ou présentant
une frontière ambiguë est refusé avant effacement. La liste des identifiants est
scellée ; un nouveau contexte ou une nouvelle génération impose une nouvelle revue.
Les identities partagées avec les pairs (y compris anciennes sessions et aliases)
ne sont pas ajoutées à la portée effaçable. Un SID partagé n’est jamais supprimé.

Les gates TERMINÉ/BLOQUÉ restent distincts dans la preuve : la branche technique
d’entretien ne déclare pas les anciens changes livrés. Les prévols/contexts sans
statistiques natives n’obtiennent pas de rapport inventé. Les rapports existants
restent conservés et consultables ; les fichiers métier du projet ne sont pas
supprimés. Toute liaison native SGS à retirer garde son snapshot durable préalable.

## Cycle et preuve

Appliquer ensuite [change-erasure](change-erasure.md) : nettoyage natif OC ciblé
sur les SID uniques du lot et descendants autorisés, seal, execute, certificat
externe, finalize puis verify. Une seule transaction et une seule bascule pour
le lot. Le canal propriétaire, UID, signatures, candidats hachés et réancrage
restent ceux du nettoyage unitaire. Aucun reset, permission once ou effet rejoué.
Les ateliers des seuls couples change/RUN sélectionnés sont retirés.

Comparer après reprise le registre et les vues de toutes les briques, les
identités/versions/accès/baux/once des RUN conservés et le PID OpenCode. Les
progrès légitimes des pairs ne sont pas des données à restaurer. PURGED est la
preuve finale ; un certificat en attente de finalize ne l’est pas. Conserver
les incidents CCAB encore nécessaires ; seuls les résolus concernés sont retirés.
Une source historique non classée ou un effet incertain est diagnostiqué dans
CCAB, sans contourner les gardes ni effacer le contexte pour cacher le refus.
