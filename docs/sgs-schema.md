# Schéma SGS CAB — cab-sgs-1

Python 3.11 ou supérieur, bibliothèque standard uniquement. Commandes et modes
en MAJUSCULES. Le moteur est une brique documentaire de CAB, indépendante du
broker et du pilotage. VERSION est sans effet ; INSPECT et QUERY ne créent aucun fichier.

## Contribution

Le moteur expose `blank()` pour construire une contribution complète sans
réinventer ses clés. Chaque mesure contient exactement :

```json
{"state":"known","value":"12","reason":null,"evidence":[{"line":42,"note":"Total final explicitement documenté"}]}
```

`value` est une chaîne décimale exacte, jamais un flottant ; les comptages sont
entiers. `unavailable` et `contradictory` utilisent `value:null`, un motif et les
preuves disponibles. Zéro connu est différent de null. L’unité de chaque clé
est définie dans METRICS : secondes pour les durées, tokens et comptages.

Les clés de contribution sont `metrics`, `agents`, `bounds`, `performance`,
`costs`, `breakdowns`, `web_calls`, `sessions`, `proof_ids`.

- `agents` : objets `{role,agent,model,reasoning}` ; rôle `coder` ou
  `orchestrator`, agent libre déclaré (chaîne non vide de160caractères maximum, sans caractère
  de contrôle ni séparateur de tableau), ou null si inconnu. Aucun produit
  n’est requis ; `codex` et `opencode` restent des identités compatibles.
- `bounds` : `{start,end}`, secondes UTC en chaînes ou null ; seules les
  bornes globales complètes du change sont retenues.
- `performance` : objets `{model,reasoning,ttmt,throughput}` pour les seuls
  codeurs OpenCode ; mesures moyennes par change, chaînes ou null.
- `costs` : dictionnaire par devise ISO, valeurs au format mesure.
- `breakdowns` : catégories (`tools`, `message_roles`, `command_families`, `test_categories`,
  `openspec_results`) de couples `{numerator,denominator}`, en chaînes, pour
  des populations compatibles. Le moteur produit aussi les index `ratios`.
- `web_calls` : objets `{type,tool,target,result}` pour les seuls appels
  attestés ; ni URL simplement citée ni transport privé.
- `sessions` et `proof_ids` : identifiants de provenance, sans contenu brut.

Le registre `schema_version:1`, `engine_format:"cab-sgs-1"` contient le contrat
SGS exact, génération, empreinte du rapport, `complete`, `changes`,
`aggregate_state` et `code_state`. Chaque change est indexé par son chemin
relatif d’archive et contient `report_path`, `report_sha256`, `contribution` et
`review` éventuelle. Les index agrégés conservent sommes/effectifs, identités et
multiplicités ; ils ne demandent aucune relecture des autres archives en DELTA.

## Revue d’une extraction narrative

`.STATISTICS.review.json` est un objet indexé par chemin d’archive. Chaque
entrée fournit `report_sha256` et les seuls champs corrigés de contribution.
Les mesures remplacées utilisent le format complet ci-dessus. Les lignes
doivent exister dans ce rapport. Le moteur conserve la revue dans le registre.
Une revue périmée est refusée, sans réutilisation arbitraire des anciennes valeurs.
Le motif documente la résolution ou l’indisponibilité ; il ne remplace pas
l’examen. La revue est un fichier technique temporaire autorisé par SGS.

## Preuves de session pour CHANGE

Les preuves JSON sur stdin (--evidence -) contiennent les champs obligatoires `schema_version:1`,
`session_id`, `scope` et `contribution` complète. `scope` vaut `cumulative`
(instantané de l’ensemble du change) ou `increment` (session disjointe).
Un cumul remplace les compteurs antérieurs dans le calcul, sans effacer leur
historique. Les tests, tâches et contrôles syntaxiques décrivent l’état final
du dernier relevé, sans addition des campagnes répétées. Des incréments dont
une mesure manque ne deviennent pas un total exhaustif connu.

Un champ optionnel `details` conserve les preuves propres au rapport individuel
qui ne sont pas des mesures du global : dictionnaire par section `"1"` à `"6"`,
chaque valeur étant une liste de `{label,value,proof}` textuels sur une ligne.
Il permet notamment les décisions, chemins de fichiers, commandes, résultats
et limites de collecte. Les quotas éventuellement autorisés par une session
pilotée restent dans ces détails individuels ; ils ne sont jamais extraits
dans SGS. Aucune donnée sensible ou sortie brute n’est admise.

Un nouveau rapport canonique conserve les six sections de niveau2 et un commentaire
`CAB_SGS_SESSIONS_V1` avec les sessions structurées. Un ancien rapport est
préservé, ses mesures initiales deviennent un relevé historique ; les nouveaux
faits sont ajoutés dans chacune de ses sections. Le moteur ne modifie ni tâches,
ni BLOCKERS.md, ni autres artefacts. L’état `blocked` requiert BLOCKERS.md et un
change ouvert ; `archived` requiert le dossier d’archive existant.

## Import optionnel d’un résumé public CAB

L’enveloppe JSON contient `schema_version:1`, `project_root` absolu canonique,
`summary` (réponse publique CAB `schemaVersion:2`) et `bindings`. Chaque binding
contient exactement :

```json
{"archive_path":"openspec/changes/archive/2026-11-05-example","report_sha256":"<SHA256 du rapport>","runId":"RUN","contextId":1,"role":"coder","coverage":"complete-production"}
```

`complete-production` est une attestation vérifiée par l’appelant, pas une
déduction du moteur depuis un compteur. Contexte et change doivent correspondre.
Un contexte dupliqué, une autre racine, une empreinte périmée ou des événements
abandonnés sont refusés. Messages et outils peuvent compléter des mesures
absentes ; une valeur présente est comparée, jamais ajoutée. Aucune durée busy,
quota, décision d’orchestration, coût ou token absent du résumé n’est inventé.
Le moteur ne se connecte à aucun endpoint. Conserver les preuves pertinentes
dans le rapport de change pour les futurs deltas sans import global.

## Transactions

Le verrou système commun `.STATISTICS.lock` reste présent après libération.
Les seuls fichiers de publication sont le couple, `.STATISTICS.transaction.json`
et `.STATISTICS.<nom du fichier>.candidate` / `.backup`. Le journal est durable
avant les remplacements et supprimé en dernier. RECOVER valide identités,
empreintes, rendu et association du couple avant de terminer une publication.
Un état extérieur divergent n’est pas écrasé. La suppression préalable en
REBUILD restaure l’absence du rapport en cas d’échec, sans sauvegarde de l’ancien.

Une erreur est un JSON `status:error`, code1 ; une invocation syntaxiquement
invalide relève d’argparse, code2. Aucun échec technique ne devient un N/A de
substitution d’un rapport non analysé. Les progrès du recalcul sont sur stderr.

## Richesse des rapports de change

Les références de qualification sont les rapports Pixs : tableaux complets
d’agents, distributions des rôles et outils, résultats techniques, décisions,
chemins absolus, commandes et sorties qualifiées, web, bornes, quotas autorisés,
sondes et reprises datées. Rien de disponible n’est remplacé par N/A pour
simplifier le rendu. Les exclusions de SGS concernent le global uniquement.

`agent_details` est une liste optionnelle de `{role,model,version,provider,
reasoning,ttmt,throughput,service_percent}` textuels. Les deux tableaux d’agents
sont rendus avant les six sections ; sans cette métadonnée, seules les valeurs
présentes dans la contribution sont utilisées et les autres restent N/A.

`tables` est un dictionnaire par section `"1"` à `"6"`, chaque valeur étant une
liste de `{title,columns,rows}`. Colonnes : libellés textuels ; lignes : listes
de même largeur, cellules textuelles ou entières. Ces tableaux préservent les
colonnes détaillées des références : par fichier, commande, statut, sonde, etc.
`notes` contient par section une liste de paragraphes factuels. Les tableaux,
notes et détails historiques sont conservés lors des amendements. Un export
CAB attaché à CHANGE génère directement ses tableaux par rôle et outil, sans
faire reconstruire ces ventilations au prompt de codage. Ce résumé public ne
collecte pas les chemins et commandes exactes : ne pas les inventer.

Dans le global, les populations de répartitions exhaustives partagent le même
dénominateur même si certains rôles ou outils ont un effectif nul et ne sont
pas nommés dans chaque change. Les répartitions partielles conservent leurs
seuls dénominateurs attestés ; les index nécessaires sont retirés et ajoutés
avec la contribution. Les exemples de Pixs sont lus en qualification, sans
modifier ses rapports ni utiliser ses chiffres pour le projet CAB.

## Modes de publication

`--file-mode` exige 0770 lorsqu’il est fourni. Sans option, les modes existants sont
conservés ; un nouveau rapport et un nouveau registre utilisent 0770. Les
candidats et retours arrière conservent les modes des livrables ; les nouveaux
verrous utilisent 0770. Pour CAB, passer explicitement 0770.

Les `.STATISTICS.*` sont des fichiers techniques non versionnés. SGS ne modifie
pas `.gitignore` ; leur exclusion relève du processus Git autorisé du projet.
Ne pas supprimer le verrou persistant lors du nettoyage.

## Requêtes indépendantes des agents

Toute session directe ou pilotée appelle la même CLI Python, avec sorties JSON
et codes0 (résultat, y compris absence),1 (erreur),2 (syntaxe invalide). Aucun
identifiant CAB, orchestrateur précis ou SDK n’est obligatoire. L’import CAB
est un adaptateur optionnel ; le contrat SGS définit le périmètre des mesures,
notamment les performances OpenCode historiques, sans restreindre les appelants.

`QUERY --project-root /racine --contract /prompts/SGS.md` consulte le couple
publié sous verrou partagé existant, sans création, récupération ou recalcul.
Le résultat contient `status:queried`, `mutated:false`, `engine_format`,
`generation`, `nca`, `report_sha256` et `data`. Sans filtre, `data` contient
`aggregate_state` et `code_state`. `--metric <clé METRICS>` renvoie le bucket
exact `{sum,count}` ; ce sont la somme et le nombre de contributions connues,
pas une moyenne déjà calculée. Avec `--change <chemin relatif d’archive>`,
`data` contient la contribution complète ou sa mesure filtrée
`{state,value,reason,evidence}` ; `source_sha256` et `report_path` l’identifient.
`not-found` signifie une archive absente du registre ; `absent` signifie que les
deux livrables manquent. Un couple partiel/divergent ou une transaction en attente
échoue sans mutation. Les empreintes sources sont celles de la génération
publiée ; `VERIFY --sources` contrôle explicitement leur actualité. INSPECT
consulte directement un rapport, y compris un change ouvert encore exclu du global.


## Isolation du rapport individuel — CAB2.3.2

CHANGE accepte --evidence - (stdin, limité à64Mio comme un fichier). Un fichier
explicitement réservé reste compatible ; sa préparation et lecture doivent
être isolées. CHANGE ne récupère jamais le global pour générer son rapport.
Le verrou local porte sur l’inode du répertoire du rapport, sans fichier
persistant supplémentaire. Le seul candidat est <rapport>.sgs-candidate,
nettoyé après remplacement ou échec propre. Ne pas supprimer un candidat
préexistant qui n’appartient pas à cette invocation.

--report sélectionne un fichier existant dans le change ciblé. Une variante
connue sans sélection explicite est ambiguë et ne crée pas STATISTICS.md.
Une structure autre que six sections reçoit une annexe de niveau3 ou inférieur,
sans modification de ses titres H2 ou de son contenu historique. Une variante
reste exclue du global ; --maintain-global retourne not-admissible pour elle.

--maintain-global produit d’abord le rapport sous sa protection locale, puis
appelle DELTA sous le verrou global. Une erreur globale attendue est restituée
dans global.status=error, avec cause ; le statut individuel et le code0 restent
ceux du rapport réussi. L’absence de --maintain-global n’accède à aucun état
transactionnel global. Le consommateur vérifie les deux statuts séparément.

Sous CAB, REPORT réserve le rapport et son candidat exact. La restauration
accepte aussi les anciennes réservations du seul rapport ; /closing les
réancre explicitement avant utilisation du candidat. Le delta est appelé
par l’orchestrateur sous autorisation distincte, hors du mandat REPORT du codeur.


## Point de départ du suivi

Dès l’amorçage de la session, après résolution des sources requises et avant
l’exploration métier, l’appelant vérifie VERSION puis
initialise en mémoire schema_version:1, session_id stable, scope:cumulative
et contribution:blank(). Il fournit la borne de début UTC attestée dans
contribution.bounds.start et les agents connus ; la borne de fin reste null.
Il conserve project_root et change_id dans le contexte de son historique ou
checkpoint déjà autorisé. Ces deux champs ne sont pas ajoutés au JSON CHANGE,
car ils sont fournis par les arguments explicites --project-root et --change.
change_id reste null jusqu’à la sélection autorisée et est fixé avant la
première tâche ; aucune cible fictive n’est créée pour initialiser le suivi.
Les compteurs absents restent unavailable. L’appelant alimente les preuves
pendant les tâches ; le moteur ne dispose pas d’un observateur universel des
agents. Aucun nouveau fichier de suivi partagé n’est requis.

## Export des périodes CAB3.0.6

La commande publique statistics.change renvoie cab-change-statistics-1 et son
sgs_evidence directement admissible comme entrée structurée de CHANGE. Ce bilan
est cumulatif pour le change, avec plusieurs RUN/SID possibles ; ses proof_ids
identifient l’empreinte de toutes les périodes. Les pages servent à inspecter
les affiliations et bornes, sans contenu de conversation.

change_coverage_complete exige toutes les périodes fermées et un premier début
attesté pour chaque RUN. Sinon les mesures natives/durées du change restent
indisponibles dans SGS ; les seuls écarts observés sont conservés dans l’export
comme mesures partielles. Les preuves de tests et tâches restent indépendantes.
Les anciens totaux session-wide n’alimentent jamais cette contribution.

CAB3.0.7 exclut aussi les compteurs non actualisés et les bornes temporelles
manquantes ; une valeur inchangée dans un vieux journal ne prouve pas zéro token.
