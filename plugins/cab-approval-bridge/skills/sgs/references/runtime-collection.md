# SGS permanent — cible 2.4.0

Le service `cgpt-approval-bridge-sgs.service` possède la base SQLite privée,
les événements dédupliqués et les curseurs. Son socket Unix utilise l’identité
du processus local. Une source native doit être enregistrée explicitement et
liée au projet/change/RUN/session/rôle/instance ; aucun titre ou SID homonyme
ne permet de lui substituer une autre instance. Une session directe conserve
son codeur réel sans fabriquer un orchestrateur ou OpenCode.

Depuis les scripts du plugin installé :
`node cgpt-approval-bridge-runtime-command.mjs sgs <action>`.
`status` vérifie le service chargé ; `stats /racine/projet` le consulte.
Les mutations `bind`, `source`, `event` lisent leur objet JSON sur stdin.
Ne pas interpoler un objet ou un secret dans une commande shell.

`bind` attend exactement binding, host, instance, project (racine canonique),
change, run, session, role (coder/orchestrator), agent, mode (direct/piloted)
et started_at (horodatage natif avec fuseau). L’identité et les bornes sont
stables ; les valeurs inconnues ne sont pas inventées. La présence d’un
plugin ou d’un dépôt ne vaut pas demande de CAB direct.

`source` raccorde binding, source=codex-native et location : le fichier JSONL
natif exact de cette session sous le compte autorisé. Le service vérifie
session/projet dans les métadonnées, lit une liste blanche quantitative,
avance son curseur après stockage et n’enregistre aucun prompt/réponse.
Une source déplacée ou remplacée est signalée, pas relue aveuglément.
Le contrôleur enregistre la source OpenCode ; le collecteur permanent de SGS
lit ensuite ses compteurs de messages natifs, déclenché par les événements
avec une réconciliation périodique, sans solliciter le LLM.

Les événements contiennent binding, event_id, source, stream, sequence, at,
semantics (delta/cumulative), metrics, et facultativement model/coverage.
Modèle : name/provider/reasoning, inconnu=null ; les périodes sont conservées.
Les métriques absentes valent N/A ; les coûts et tokens natifs restent distincts.
Cache/raisonnement ne sont pas ajoutés aux totaux qui les incluent déjà.
Les fournisseurs peuvent définir différemment entrée/cache : SGS conserve les
champs natifs et leur source. Il ne déduit pas un total absent en additionnant
des champs dont le recouvrement n’est pas établi.
Les compléments LLM ne doublent pas les métriques natives disponibles.
Une rupture de compteur est une lacune de couverture, pas une mesure recréée.

L’outbox locale permet la reprise après indisponibilité du service ; conserver
une lacune explicite si une capacité est épuisée. La collecte ne bloque pas le
codage. Les quatre cadrages et les références d’installation décrivent
l’activation ; source écrite et test de fixture ne prouvent pas service actif.
SGS reprend lui-même l’outbox privée après son retour, dans l’ordre liaison,
source, événements ; aucun nouveau tour d’agent n’est nécessaire pour ce drain.
Une liaison figée refuse tout nouvel événement, même antidaté ; les doublons
strictement identiques restent acquittables. Figer après le dernier drain et
avant de générer le rapport durable qui précède la purge.

L’import des rapports `STATISTICS.md` et historiques `STATISTIQUES.md` conserve
chemin, empreinte et contribution extraits par le moteur existant, sans
réécrire les archives. Les contributions archivées et les sessions natives
restent distinctes pour éviter un double comptage du même change. Les modes
CHANGE/DELTA/QUERY/VERIFY existants gardent leurs autorisations et leurs reçus ;
l’import runtime n’est pas une autorisation de REBUILD global.

## Session Codex directe

`node cgpt-approval-bridge-direct.mjs start --project /racine --change <change>
--run <RUN>` est l’opt-in CAB direct. Il lie la véritable session Codex à SGS,
crée son atelier et ouvre son moniteur dédié sans OpenCode. `track` raccorde
seulement la télémétrie dans un mandat de suivi existant, sans activer CAB direct.
Le fournisseur, le modèle et le raisonnement proviennent de la télémétrie native
quand ils sont exposés ; aucun texte de conversation n’est transmis à SGS.

Avant le rapport terminal, terminer la collecte et appeler `freeze --project
/racine --binding <binding>`. Un second appel reprend la borne déjà enregistrée.
Générer ensuite le rapport avec son annexe native et le vérifier. Après archive,
ou arrêt explicite pour dépendance avec BLOCKERS.md, appeler `finalize --project
/racine --change <change> --run <RUN> --session <session-native> --branch
TERMINÉ|BLOQUÉ --receipt-id <identité-stable>`. Ce nettoyage refuse une fenêtre
statistique ouverte ou un autre RUN/session du même change, vérifie le rapport
via SGS, conserve les copies consultables puis nettoie le seul atelier propre.
Une reprise conserve les mêmes identités et le même reçu. L’archive source et
les ateliers des autres sessions restent présents.

## Copie historique explicitement supprimée

La demande du développeur peut viser les copies CAB d’un rapport avant archivage
d’un chat. POST local SGS /archives/forget reçoit project et paths exacts ;
il supprime la copie et conserve seulement l’empreinte opaque nécessaire au
non-réimport. Il ne supprime pas le fichier métier. /storage/compact termine
le retrait des pages SQLite/WAL ; même opération pour CCAB après purge des
incidents résolus. Une donnée encore nécessaire aux RUN conservés est protégée.
Un conflit natif de dernière révision est partiel/N/A, pas un total choisi
arbitrairement ; une révision supérieure lève ce diagnostic.

Lors d’un effacement, le champ transitoire `erasure_prepared` du seul
checkpoint `broker-statistics` est retiré s’il correspond exactement au reçu
courant, y compris dans l’outbox. Un marqueur d’une autre transaction et les
statistiques des pairs conservent les contrôles ordinaires.
