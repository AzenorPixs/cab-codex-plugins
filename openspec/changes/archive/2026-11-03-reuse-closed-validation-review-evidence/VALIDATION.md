# Qualification SCM — CAB2.2.6

## Mandat

Le développeur demande les correctifs CAB sous SCM, incrément, publication,
CABU et remontée aux sessions. Il réserve son intervention au hors-périmètre
et demande une autonomie maximale de l’orchestrateur, avec optimisation du
temps, des tokens et surtout du cache de prompts LLM. Les rapports des sessions
apportent des faits, sans autoriser de mutation métier par ce correcteur.
Aucun RUN/job/SID Pixs ou magasin broker n’est édité manuellement.

## Matrice fonctionnelle

| Critère | Réalisation | Preuve |
|---|---|---|
| Historique long | sélection des seuls cancel-reviewed-validation DONE/HTTP200 même owner/RUN/contexte/version | test HTTP trois shells dont deux clos ; tests owner/contexte/version/digest/état/natives divergents |
| Native d’origine | request natif exact, codeSHA, commandeSHA, aborted V2, chronologie et partDigests | calls inconnus/modifiés/dupliqués et wrapper changé refusés |
| Conservation | ancienne issue UNDETERMINED_READ_ONLY, nouveau terminal permission non prouvée | opérations/once/nativeResult inchangés hors coordination ciblée ; replay/restart |
| Diagnostics | transport MCP connu sans capacité d’exécution ; résultat transformé non utilisé comme preuve approved | health/get transformé et request MCP en erreur dans fixture historique ; appels inconnus restent refusés |
| Temps | index request/cancel/call partagés, sans boucle de parse du transcript par ancienne preuve | 15 contrôles HTTP de la branche finale réussis après indexation |
| Retrait non émis | action propriétaire distincte, zéro appel à effet/permission/once/native/access, deux snapshots | positif/replay/restart et 8 refus : effet, permission, busy, accès, once, frontière, owner, référence absente |
| Incertitude | COORDINATION_WITHDRAWN_BEFORE_ISSUANCE ; approved conservé | aucune native reply, nativeResult ou NO_EFFECT fabriquée ; autres leases inchangées |
| Cache LLM | priorité explicite dans PROJECT, compteurs natifs read/write existants | aucune politique fournisseur changée, aucun hit/coût/gain non mesuré annoncé |
| Port historique | procédure de continuation disjointe et refus de capture non quiescente | documentation listening=false/candidats/temps ; aucune libération présumée de5173 |

## Tests et méthode de qualification

Suite Node globale : 951 cas, 920 réussites, 0 échec, 31 ignorés,
91 945ms. Python de référence :93/93, 5 002ms. OpenCode2.2 réel avec
fournisseur synthétique loopback :1/1, 9 566ms. Total final unique exécuté :
1014 réussites ;31 ignorés. Les campagnes ciblées ne sont pas additionnées.

35 nouveaux/anciens cas HTTP de frontière et23unitaires autonomes ont réussi.
Après la suite globale, un dernier amendement local remplace le parcours de
cancel par preuve par un index partagé, sans changer les critères. Le contrôleur
final est vérifié syntaxiquement et les15tests HTTP concernés (historique et
retrait) passent sur ce code final. La suite globale n’est pas présentée comme
réexécutée après cette indexation ; aucun comportement des branches non
concernées n’a été modifié. Cette vérification ciblée évite une répétition
globale sans nouvelle question fonctionnelle.

Syntaxe :89Node et11Python,100fichiers distincts ; contrôleur final revérifié.
OpenSpec strict :20/20avant archive, 19/19après synchronisation.

## Précontrôle réel

Le transcript réel PA01 est observé en lecture seule. La nouvelle fonction
qualifie exactement le terminal call_01a1a0bb6e5472c79fe28984d065ac2d,
exit0, commande fc5478f9ef7667385c45a5a71db3045344730bd55a56a89f60538c42fd6d2ba4,
avec cinq parties anciennes reconnues via le reçu DONE antérieur du même RUN.
Résultat : preflightOnly=true, mutated=false, qualified=true,
proofKind=REVIEWED_READ_ONLY_TERMINAL. La nouvelle action reste à appliquer
par le propriétaire après activation. Les anciennes issues restent indéterminées.

Le propriétaire PA01 confirme qu’il avait envoyé once directement par le
client, hors chaîne d’accès/intention/ACK du contrôleur. Ce204 ne devient
pas un reçu CAB. La consigne distribuée est rendue explicite ; aucun ACK
historique n’est reconstitué. Les travaux disjoints restent à son orchestration.

Le retrait CISMP5 est qualifié par fixtures correspondant au rapport owner :
PREPARED/approved, zéro shell/permission/access. Aucun essai de retrait réel
n’est effectué par le correcteur. Le Vite5173 reste protégé ; son absence de
listener avec trois candidats et des captures distantes de plus120s ne
qualifie pas une fin de serveur. La cause de ces candidats n’est pas attribuée.

## Échecs intermédiaires traités

Le premier test positif historique échouait sur le wrapper exact d’annulation
normalement qualifié sans revue manuelle de wrapper. La reconnaissance existante
exactCancelApprovalWrapper est désormais réutilisée, avec sortie CANCELLED et
identité concordantes. Une syntaxe résiduelle de ternaire a été corrigée avant
les campagnes réussies. Un script d’alignement s’est arrêté sur une assertion
d’ancre documentaire après alignement des versions ; la documentation et les
empreintes ont ensuite été complétées, avant tout commit/tag/push/CABU.

Le premier précontrôle avait omis directory/changeId du RUN de sa fixture locale ;
il a été corrigé. Le second détectait deux diagnostics MCP transformés et un
ancien request MCP échoué : leur transport connu sans effet sur l’environnement
est conservé, sans déclarer NOT_ADMITTED ni utiliser leurs résultats comme
preuve d’approbation. Les identités complètes et le terminal actuel restent requis.

## Bilan documentaire

| Document | État et preuve |
|---|---|
| AGENTS.md | Inchangé : autorité/delegation existantes et demande explicite rappelée ci-dessus. |
| PROJECT.md | Mise à jour : efficacité/autonomie et cache de prompts LLM explicitement distingué du cache local. |
| TECHNICAL.md | Mise à jour : réemploi et retrait avant émission, référence autonome détaillée. |
| BUILD.md | Mise à jour : mêmes artefacts, aucune dépendance nouvelle, version2.2.6. |
| DEVOPS.md | Relevé DIU existant conservé sans édition manuelle ; outils de référence utilisés. |
| DEVELOPMENT_MAP.md | Amendement ciblé du change, code non attribué ; aucune reconstruction globale. |
| README.md | Mise à jour : deux voies et limites des preuves historiques. |
| CHANGELOG.md | Entrée2.2.6 : réemploi, retrait et responsabilité once. |
| openspec/specs/ | Deux exigences nouvelles à synchroniser lors de l’archive. |

Le noyau distribué conserve les gardes. La revue propriétaire et les preuves
techniques restent nécessaires ; aucune publication ou activation n’est déduite
des tests source. Les clôtures métiers appartiennent aux orchestrateurs.
