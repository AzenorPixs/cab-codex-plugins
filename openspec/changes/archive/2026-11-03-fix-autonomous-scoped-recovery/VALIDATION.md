# Qualification SCM — CAB 2.2.4

## Mandat

Le développeur confie à l’orchestrateur les décisions, revues, validations et
reprises dans le périmètre validé du change ; son intervention décisionnelle
est réservée aux extensions hors périmètre. Il demande ce correctif sous SCM,
incrément, publication puis CABU. Aucun RUN Pixs n’est modifié manuellement.
Les actions des propriétaires restent distinctes de la livraison de CAB.

## Matrice de cohérence

| Critère | Réalisation | Vérification |
|---|---|---|
| Décideur dans le change | plan recovery propriétaire ; policy à installer, pas human par défaut | tests des offres/autorités et contrat |
| Refus natifs auditables | intention exclusive, ACK204 privé, provenance programmatique, pas de commande/secret | ACK relisible, crash/intention et perte de réponse sans second POST |
| Annulation revue non consommée | PREPARED/approved, aucun accès/native, revue SHA/source/refus, double observation | cas HTTP positif ; WRITE, owner/digest/source divergents et once consommée refusés |
| Transport Code Mode | projection liée aux SHA de wrappers relus ; NOT_ADMITTED sans admission locale | cas de retry refusée avant cancel ; précontrôle réel PA01 |
| Issue historique honnête | approved conservé, réponse locale retirée, UNDETERMINED_READ_ONLY | replay, redémarrage, aucune native once ou sortie fabriquée |
| Port long quarantiné | deux nouvelles sondes natives distinctes ; code exact/nonce, PID/starttime, namespaces, scope/proc/listener | listener/processus présents et captures divergentes refusés ; HTTP positif/replay/restart |
| Ressource quiescente | CANCELLED de coordination, accès RECONCILED, ancienne once conservée, nativeResult absent | empreintes et états vérifiés ; aucun NO_EFFECT ou exit historique inventé |
| Instance native | observation privée avant nouveaux mandats ; reçu CABU antérieur pour l’ancien cas | journal en lecture seule, legacy sans backfill, cgroup divergent refusé |
| Extension additive | CAS manifeste, même namespace/droits, disjoint, génération/tokens/fencing conservés | accès détenu et once quarantinée inchangés ; owner/stale/overlap/namespace/droits refusés ; crash idempotent |
| Compatibilité | registre schéma 4 conservé ; type d’erreur diagnostique non énumérable | empreintes historiques inchangées, tests de reprise, fermeture des imports moniteur |
| Livraison | CAB/CABU et quatre briques en 2.2.4 | publication et activation attestées après commit |

## Contrôles ciblés acquis

- Premier noyau : 22 unités et 9 tests HTTP réussis.
- Sonde et instance : 30 puis 39 unités couvrant aussi captures adversariales et métadonnées.
- Ensemble HTTP de récupération : 15/15 réussis, dont annulation revue et port quiescent.
- CABU/distribution : 120/120 au jalon initial.
- Reprise de session et moniteur : 50/50 après correction de compatibilité.
- Syntaxe : 89 Node et 11 Python, 100 fichiers distincts ; contrôleur final revérifié.
- Python de référence : 93/93 réussis.
- OpenCode 2.2.5 réel : campagne 1/1 réussie avec fournisseur de fixture, sans facturation déduite.
- OpenSpec strict : 20/20 avant archivage.

Les campagnes ciblées sont incluses dans la suite globale et ne sont pas
additionnées au nombre final de cas uniques. Les résultats définitifs sont
renseignés ci-dessous après l’achèvement réel de la dernière campagne.

## Précontrôles réels sans mutation

PA01 : le script approuvé et les deux shells ont le digest
c90c270dc5ccf2258dc38ef6bb71df9070172cb31108a9f3e6bd3d357c39f02f.
La revue structurée concorde avec deux erreurs natives aborted ; l’API du
journal retourne seulement log.synced au watermark 35374. La retry
NOT_ADMITTED et le wrapper cancel sont relus par digest ; leur projection
qualifie l’annulation native exacte. Résultat du précontrôle : reviewValidated=true,
qualifiedCancellation=true, runMutated=false. Les ACK historiques restent des
références d’audit de l’orchestrateur, pas de nouveaux reçus serveur inventés.

CISMP5 : le call Vite reste un timeout natif completed, sans exit ni shellID,
commande dfaf670500ee85745b6d7b4e974d8c35fcd0f1bee57e0eda04b7ded2a24543ae.
Le contrôleur UID1000 ne lit pas le namespace du serveur UID1002 ; les sondes
sont mandatées dans le compte natif sans sudo ou élargissement de droits.
La recherche filtrée trouve 37 anciens reçus CABU de même PID/contexte avant
l’invocation. Le reçu COMPLETED retenu est
update-1aef4a79-f23a-4c88-ba3e-2f652c0dadc6, observation 1793600958196,
antérieure au début natif 1793603236759 ; PID592984 et location Pixs concordent.
La sonde vérifie en plus la continuité du starttime. Aucun nouvel essai Vite
ou sonde de production n’a été exécuté par le correcteur avant livraison.

## Échecs intermédiaires traités

Une table testReservations absente dans une fixture est désormais prise comme
vide. La fixture de timeout/probe utilise le readback normal avant libération
au lieu d’attendre un événement partiel non normalisé. Une couverture /proc
trop large hors cgroup donnait un refus ; le scope natif est désormais lié à
l’instance, au compte, au cgroup et au projet complet, avec revue sans isolation.
Le diagnostic ne cache aucun accès refusé dans ce scope.

La première suite globale a détecté deux fermetures de moniteur incomplètes
(module permission-replies absent de la procédure extraite) et une empreinte
de prévol modifiée par un attribut diagnostique. Le bundle inclut désormais
le module ; nativeErrorType reste accessible au diagnostic sans changer les
empreintes JSON historiques. Les 50 contrôles concernés ont réussi ensuite.
Un démarrage de fixture a dépassé dix secondes ; l’observation optionnelle ne
fait plus de requête réseau bloquante avant l’écoute du contrôleur. Le test
isolé a réussi et une dernière suite globale vérifie le code final.

Les sources et spans historiques de la migration 2.2.0 restent conservés ;
seules les empreintes de leurs destinations actuelles sont actualisées.
Aucune réussite de publication ou de CABU n’est déduite des tests source.

## Résultat final

Suite finale `node --test --test-concurrency=2 tests/*.test.mjs` : 915 cas,
884 réussites, 0 échec, 31 ignorés ; durée 80 798 ms. Python : 93 réussites ;
campagne OpenCode native réelle : 1 réussite. Total final exécuté sans double
compte : **978 réussites, 0 échec**, et 31 ignorés. Les échecs intermédiaires
ci-dessus ne sont pas effacés par ce résultat.

## Bilan documentaire par fichier

| Document | État et preuve |
|---|---|
| AGENTS.md | Inchangé : délégations et autorisations applicables conservées ; mandat explicite du développeur en tête du présent rapport. |
| PROJECT.md | Mis à jour : périmètre de récupération autonome et version 2.2.4. |
| TECHNICAL.md | Mis à jour : preuves, sondes natives et version 2.2.4. |
| BUILD.md | Mis à jour : livraison des nouveaux modules et dépendance Debian standard getconf. |
| DEVOPS.md | Relevé DIU préexistant du 3 novembre 04:41 UTC conservé ; Python de référence et OpenSpec utilisés sans modification manuelle de l’environnement. |
| DEVELOPMENT_MAP.md | Amendement ciblé : change, qualification et absence de clôture métier revendiquée. |
| README.md | Mis à jour : autonomie bornée et version 2.2.4. |
| CHANGELOG.md | Entrée 2.2.4 : refus auditables, diagnostic, annulation revue, port et extension additive. |
| openspec/specs/ | Quatre capacités synchronisées à l’archivage, validation stricte avant et après. |

Les noms de lots historiques non attribués restent provisoires ; aucune
reconstruction globale de la cartographie n’est entreprise. Les versions en
production et les reprises métiers seront constatées séparément après CABU.
