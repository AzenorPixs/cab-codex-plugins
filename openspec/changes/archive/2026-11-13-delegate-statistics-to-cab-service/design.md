# Contrat validé
Les STATISTICS.md locaux, actifs/archivés/amendés, sont la seule source de vérité.
PG conserve contenu intégral, empreintes, révisions et projections structurées.
Tous les changes locaux sont rattachés à un seul projet ; les sources multiples
(amendements/archives) conservent leurs chemins et historiques sans faux RUN.
Inotify sur les seuls chemins OpenSpec déclarés et rattrapage aléatoire12–24h.
Les changements locaux déclenchent leur projection ; native/receipts ne servent
qu’à la génération CAB de la source locale, avant sa projection en PG.
Les fichiers manquants/illisibles/ambigus sont signalés, jamais inventés comme zéro.
Le global concatène les rapports locaux disponibles et manifeste les lacunes.
Il est créé automatiquement après inventaire complet et mis à jour par CAB.
Un job CAB porte toute l’écriture sous réservation PG persistante, sans fichier
.STATISTICS.lock ni déverrouillage d’un effet incertain. Les écritures s’exécutent
sous UID du propriétaire légitime, avec publication atomique et empreinte attendue.
Les modifications manuelles sont préservées ; les blocs CAB altérés ne sont pas
écrasés silencieusement. Les anciens rapports restent lisibles sans conversion.
Les statistiques générées sont exclues du hash du code, mais ont leurs propres
empreintes de clôture. La clôture attend la génération automatique après archive.
Le LLM ne produit plus les contenus ni les preuves statistiques calculées.
Les appels hérités d’écriture SGS passent par CAB, sans fallback local indépendant.
SGS.md et son index sont supprimés du corpus actif ; les contrats appelants sont
révisés et leurs versions incrémentées. Les archives historiques restent intactes.
Le mandat sur deux projets utilise la même identité native réelle, sans dupliquer
les compteurs entre les travaux ; couverture native secondaire indisponible si
le cwd natif ne permet pas une liaison directe, aucune identité inventée.

Un change ouvert sans session de codage n’attend pas de STATISTICS.md : état
not-started normal, pas de fichier vide ni de lacune statistique. L’absence d’un
rapport d’un change ayant accueilli du codage reste distinguée et visible.

Les publications CAB portent un marqueur scope/révision/horodatage UTC/empreinte
hors marqueur. PG stocke aussi le SHA256 intégral, mtime_ns et date d’import.
Les contrôles de lecture comparent le fichier réel à PG, et le global à son
manifeste de sources. Un marqueur ancien après édition manuelle ne remplace pas
le contrôle intégral des octets ; les fichiers historiques sans marqueur sont
vérifiables et ne sont pas réécrits uniquement pour les estampiller.
