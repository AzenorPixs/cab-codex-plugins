# Adaptateur commun — cab-session-coordination-1

Sous mandat autonome qualifié, [la coordination des codeurs](coder-coordination.md)
prévaut sur les propriétaires et relais historiques ci-dessous. Transfert explicite,
avis et provenance conservés ; aucun double opérateur. Vérifier la discovery du
protocole cab-coder-coordination-1, pas seulement le numéro du paquet.


Cette référence technique est commune aux modes direct et piloté. Le contrat
métier demeure dans le projet prompts, `SESSION_COORDINATION.md`, résolu via
DEVOPS.md ; le paquet CAB n'en embarque pas de copie.

## Découverte et propriétaire

Résoudre `scripts/cgpt-approval-bridge-dependencies.py` dans le plugin installé.
Appeler `capabilities` avant toute inscription : vérifier `adapter_protocol`
égal à `cab-session-coordination-1`, `protocol` égal à
`cab-dependency-mailbox-1` et les opérations nécessaires au mandat. Cet appel
ne crée ni magasin ni service. Il décrit l'interface du paquet ; la présence
et la santé du runtime et chaque admission native doivent être vérifiées
séparément. Une ancienne CLI refusant cette action est incompatible, sans
installation ou mise à jour implicite.

Le propriétaire direct est l'agent natif ; le propriétaire piloté est
l'orchestrateur natif. Un codeur ACSP ne crée pas une seconde boîte et ne
publie pas sous l'identité du parent : il transmet par le protocole piloté.
Les destinataires des notifications Codex pilotées sont les orchestrateurs,
pas les sessions OpenCode des codeurs.

## Correspondance des frontières

Chaque opération identitaire utilise `--project`, `--session` et `--run` réels.
Les identifiants de critères sont des jetons, les références détaillées restent
dans les sources métier. Le magasin privé et les UID suivent
[session-dependencies](session-dependencies.md).

| Frontière | Opération technique et preuve attendue |
| --- | --- |
| Entrée | `register --mode direct|piloted --mandate SCM|other` ; SCM et SCMP donnent SCM, CISM/CISMP/ISM/ISMP donnent other |
| État actif | `state --state active --generation <n>` après observation autorisée ; l'inscription seule ne prouve pas l'activité native |
| Reprise | mêmes identités ; si paused, génération croissante et `--resume-evidence` explicite, jamais une reprise induite par avis |
| Dépendance | `subscribe --dependency-id <id> --kind change|task|capability --subject <cible> --criterion <jeton>` ; task utilise change/tâche |
| Validation utile | `publish --notice-id <id-stable> --kind <type> --subject <cible> --proof <référence-relative>` et éventuellement `--proof-sha256` |
| Consultation | `inbox`, aux frontières actives définies par le prompt ; aucun heartbeat de consultation |
| Notification | `outbox` puis `notify-all` paginé ; contrôleur et socket qualifiés requis pour l'envoi, sinon boîte conservée et transport indisponible explicite |
| Traitement achevé | vérifier la preuve puis `ack --dependency-id <id> --notice-id <id>` ; le résultat ne valide jamais le critère métier |
| Pause | choix du développeur selon le mandat, `decide` et `state` selon la référence de boîte ; gates natifs séparés |
| Clôture | `check-close`, réconciliation et cycle de clôture du mode ; références nécessaires aux pairs conservées |

Les commandes détaillées et erreurs font autorité dans
[session-dependencies](session-dependencies.md). Une tentative inconnue est
réconciliée sur son identité avec `reconcile-direct` ou `reconcile-piloted`,
sans nouvel envoi. Ne pas répéter une action avec une nouvelle identité pour
masquer une réponse perdue. Les pages de notification et critères multiples
d'un même destinataire conservent la déduplication existante.

## Portée de qualification

La boîte opère sous le même UID et dans le même projet ; elle ne qualifie pas
un échange entre hôtes ou comptes distincts. Les scénarios CLI couvrent les
quatre couples direct/direct, direct/piloté, piloté/direct, piloté/piloté,
persistance, doublon et pause. Les essais de transport et du contrôleur sont
qualifiés séparément. Aucun test de boîte ne prouve qu'un agent consommateur
a chargé et appliqué son prompt ; cette adoption requiert ses propres traces.
