# Conception

## Observation native durable

Le contrôleur lit le journal de session V2 avec `follow=false` et exige le
marqueur `log.synced` de son watermark. Il ne traite que les événements
`session.tool.success` et `session.tool.failed` portant la session et le callID
exactement liés au mandat. L’événement `permission.replied` n’est pas dans
`Session.Event.Durable` ; sa présence ou son absence n’est donc jamais déduite
de ce journal. Les contenus et textes d’erreur restent en mémoire locale et ne
sont pas restitués dans les projections.

Une réussite terminale est rapprochée du tool part natif et de la décision
`APPROVED` exacte de l’historique. Une erreur terminale ne prouve pas à elle
seule l’absence d’effet : seule une classification fermée de refus avant
exécution, liée au même callID et à des révisions inchangées, peut conclure
`NO_EFFECT`. Une sortie non structurée reste `UNKNOWN`.

## Accès et concurrence intra-RUN

Une approbation restaurable dont la permission n’est plus pendante ne reçoit
aucune réponse native. Si sa frontière est absente, le contrôleur persiste
la décision et l’opération `UNKNOWN`, puis protège le manifeste complet
d’origine. Il n’efface pas une décision, une once ou un résultat déjà prouvé.

Chaque acquisition conserve un ensemble complet. Plusieurs accès d’un même
RUN peuvent coexister seulement lorsque leurs ensembles sont compatibles ;
les conflits attendent dans la FIFO globale. Une extension reste interdite
tant qu’un accès est détenu, pour éviter tout cycle de dépendances.

## Vérifications

Les tests couvrent l’API de journal bornée, le watermark, les événements
durables pertinents, les absences non conclusives, les identités divergentes,
la persistance d’UNKNOWN, l’absence de rejeu, les révisions et l’isolation des
accès compatibles.
