# Statistiques — CAB 2.2.0

## 1. Statistiques générales et décisions

Change archivé : `2026-11-02-track-background-shell-lifecycle`, CAB 2.2.0.
Session SCM directe, réalisée par Codex ; aucune délégation de codage ou
orchestration OpenCode de ce développement. Les sessions OpenCode citées dans
la qualification sont des fixtures du produit, pas des agents codeurs du change.

### Agent de codage

| Agent | Modèle de LLM | Niveau de raisonnement |
|---|---|---|
| Codex, session directe | N/A | N/A |

La version exacte du modèle et son niveau ne sont pas exposés par une mesure
native de cette session. Aucun orchestrateur n'est intervenu pour le codage.

| Mesure | Valeur |
|---|---|
| Date d'archivage | 2026-11-02 |
| Début de la session | N/A — borne complète non collectée |
| Fin de la session | N/A — publications SCM attestées séparément après ce rapport |
| Durée totale de la SCM | N/A — bornes globales non disponibles |
| Durée hors pauses et attentes | N/A — interruptions et attentes non instrumentées |
| Tokens de production, cache et coût | N/A — télémétrie complète de Codex non exposée |
| Compactions de production | N/A — relevé natif exhaustif indisponible |
| Demandes d'autorisation distinctes | N/A — registre exhaustif non collecté |
| Tests finaux uniques | 913 réussis, 0 échec ; 31 tests opt-in non exécutés dans la suite globale |
| Tâches OpenSpec prouvées et terminées | 26 — préparation Git vérifiée ; publication attestée séparément |
| Fichiers distincts touchés | 175 |
| Fichiers syntaxiquement valides | 104 fichiers distincts : 88 Node et 16 Python |

La migration et l'extension aux seuls renvois de 18 fichiers prompts ont reçu
les accords explicites du développeur. AGENTS.md provient du référentiel source
puis est propagé uniquement à CAB. Après explication du mécanisme DIU par le
développeur, la phrase fixant un ID de projet comme référentiel a été retirée
du source et de CAB ; leurs règles communes restent agnostiques.
Les décisions unitaires et protections des effets incertains sont conservées.
Aucun RUN Pixs, permission once existante ou service opérationnel n'a été modifié.

## 2. Types de messages et d’outils

| Mesure | Valeur |
|---|---|
| Messages par rôle | N/A — export exhaustif de la conversation non disponible |
| Appels d'outils et résultats techniques | N/A — compteur exhaustif non collecté |
| Permissions natives de production | N/A — aucune déduction depuis les appels des fixtures |

Outils employés : lecture/recherche ciblée, éditions locales, commandes de
syntaxe et tests, OpenSpec, lecture autorisée des chats et documentation
technique. Les tours de collecte de la compétence réservée au pilotage ne
s'appliquent pas à cette SCM directe et n'ont pas été déclenchés.

## 3. Fichiers modifiés

Nombre de fichiers distincts touchés : 175, après réconciliation des chemins
actifs/archivés et inclusion des 19 fichiers externes autorisés (template et
prompts). Les déplacements d'archive ne sont pas comptés deux fois.
Nombre d'écritures : N/A — compteur transactionnel exhaustif non collecté.
Ne pas confondre les 104 fichiers vérifiés avec le nombre de fichiers modifiés.

Périmètres documentés :

- AGENTS.md source et consommateur CAB ; identité de contexte conservée ;
- PROJECT.md, TECHNICAL.md, BUILD.md, README.md, CHANGELOG.md,
  DEVELOPMENT_MAP.md, BATCH_CODES.md et métadonnées 2.2.0 ;
- commandes CAB/CABU et références conditionnelles des skills ;
- broker Python source et copie distribuée, contrôleur, contexte de job,
  client OpenCode V2, coordination des ressources et updater ;
- modules continuity, recovery, shell-lifecycle et efficiency ;
- tests et preuves OpenSpec de cette archive, spécifications canoniques ;
- 18 fichiers du référentiel prompts, uniquement leurs renvois techniques.

Les correspondances de migration sont enregistrées dans migration-coverage.json.
Les empreintes et le diff des 18 fichiers externes sont conservés dans
prompts-reference-update.json et prompts-reference-update.diff. Aucun autre
consommateur AGENTS.md ni fichier du projet prompts n'a été édité par la session.

## 4. Commandes

Total exhaustif des commandes de production : N/A — historique complet non
instrumenté. Les passages ciblés et relances intermédiaires ne sont pas ajoutés
aux tests finaux. Le bilan final, aux catégories disjointes, est le suivant :

| Suite finale | Réussis | Échoués | Non exécutés |
|---|---:|---:|---:|
| Node, suite complète | 819 | 0 | 31 |
| Python du projet, unittest | 93 | 0 | 0 |
| OpenCode 2.2.5 réel isolé, campagne native | 1 | 0 | 0 |
| Total des tests finaux exécutés | 913 | 0 | 31 |

Commandes finales exécutées :

- `node --test tests/*.test.mjs`, confirmé après retrait du protocole local ;
- Python 3.14 du projet, `-m unittest discover -s tests -p 'test_*.py'` ;
- `CAB_TEST_OPENCODE=... node --test tests/native-opencode-codemode.test.mjs` ;
- `node --check` pour 88 modules et `-m py_compile` pour 16 fichiers ;
- OpenSpec strict CAB avant archive, puis strict canonique après archivage ;
- OpenSpec strict du projet prompts, 4 éléments valides ;
- contrôles documentaires après correction agnostique, 36 tests réussis déjà
  compris dans le corpus de tests : ils ne sont pas recomptés.

La validation canonique juste après archivage a d'abord échoué sur six
avertissements : trois Purpose générés automatiquement et trois exigences
trop longues. Les Purpose ont été renseignés et les exigences condensées à
portée constante, sans réarchiver ; le contrôle strict final fait autorité.
Ce sont des échecs de validation documentaire intermédiaires, pas des tests
fonctionnels finaux en échec. Le nombre exhaustif des invocations OpenSpec
standard/strict dans tout le change reste N/A ; les nombres d'éléments validés
ne sont pas des nombres d'invocations.

La qualification native isole un provider synthétique et deux RUN : shell
background en cours, même call/once, PID OpenCode et broker conservés, bail
disjoint identique, reprise observée en au plus 230 ms. Cette borne n'est ni
une coupure réseau exacte ni une garantie de temps en production. Le comparatif
CABU sur services simulés reste distinct de la qualification réelle ; ses
mesures ne sont pas des durées globales de développement ou des coûts de LLM.

## 5. Accès web

Total exhaustif et ventilation des appels web : N/A — export complet non
collecté. Les documentations officielles OpenCode V2 ont servi à vérifier
le contrat des API shell et compactage. Les URL citées dans les documents ne
sont pas comptées comme autant de visites. Les accès HTTP/SSE localhost des
fixtures ne sont pas des appels web de production.

## 6. Synthèse globale

Résultat fonctionnel : continuité durable, récupération typée et limitée au
mandat, shells durables et restitution des baux par ressource, CABU sélectif,
contrat modulaire et mesures natives sans facturation inventée. Les 913 tests
finaux ont réussi ; 31 opt-in sont restés non exécutés dans le corpus global.
La campagne OpenCode réelle a été exécutée séparément et compte une seule fois.

L'archive OpenSpec existe et ses spécifications sont synchronisées. Les
publications SCM et l'activation sont des étapes distinctes, attestées dans
le bilan terminal. Le service opérationnel observé est resté en 2.1.81 ; aucune
activation 2.2.0 n'est déduite de cette qualification source. La maintenance du
rapport statistique global est réalisée avant commit, sur 135 archives admissibles. Les mesures absentes
restent N/A et aucun état incertain n'a été déclaré terminé pour contourner
une protection.

Limite de la maintenance SGS : le lexer disponible ne reconnaît pas certains
littéraux regex JavaScript valides ; les stocks des périmètres concernés
restent N/A. La compilation Node et les tests ont réussi ; cette limite de
mesure n'est pas un échec de compilation du produit.
