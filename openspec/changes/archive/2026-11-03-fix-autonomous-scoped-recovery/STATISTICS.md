# Statistiques — CAB 2.2.4

## 1. Statistiques générales et décisions

Change archivé : `2026-11-03-fix-autonomous-scoped-recovery`, SCM directe.

| Agent | Modèle de LLM | Niveau de raisonnement |
|---|---|---|
| Codex, codage direct | N/A — télémétrie native exhaustive absente | N/A — non mesuré nativement |

| Mesure | Valeur |
|---|---|
| Date d’archivage | 2026-11-03 |
| Début et fin de session | N/A — bornes globales non instrumentées |
| Durée totale et hors pauses | N/A — interruptions non mesurées |
| Tests finaux uniques | 978 réussis, 0 échec ; 31 tests opt-in ignorés |
| Tâches OpenSpec prouvées et terminées | 8 — préparation SCM ; publication et CABU attestés séparément |
| Fichiers distincts touchés | 142 |
| Fichiers syntaxiquement valides | 100 fichiers distincts : 89 Node et 11 Python |
| Tokens, cache, coût et compactions de production | N/A — télémétrie exhaustive non exposée |

Mandat explicite : correctif sous SCM, incrément, publication, CABU et remontée
aux sessions de codage. Dans le change, l’orchestrateur décide, revoit, valide
et reprend ; le développeur tranche les extensions hors périmètre. Aucun RUN
Pixs n’a été édité manuellement par le correcteur.

## 2. Types de messages et d’outils

Lectures ciblées, édition locale, tests Node/Python/OpenCode réel, OpenSpec et
Git SCM. Aucun agent délégué. Les fixtures natives ne sont pas des agents de
développement. Messages et appels exhaustifs par rôle : N/A — export absent.

## 3. Fichiers modifiés

Journal des refus, instances natives, sondes et preuves de récupération,
extensions de manifeste, contrôleur, registre, client, reprises et fermeture
des dépendances CABU/moniteur. Versions, manifestes, unités, commandes,
références, cadrages et tests alignés ; quatre capacités OpenSpec synchronisées.
DEVOPS.md généré antérieurement est conservé sans édition manuelle. Inventaire
exact : chemins du commit SCM après publication. Lignes et écritures : N/A —
métrique exhaustive non collectée. Les destinations actuelles du manifeste de
migration 2.2.0 gardent leurs sources et empreintes historiques identifiables.

## 4. Commandes et validations

| Vérification finale | Réussites | Échecs | Ignorés |
|---|---:|---:|---:|
| Node, suite globale finale | 884 | 0 | 31 |
| Python, unittest de référence | 93 | 0 | 0 |
| OpenCode natif réel | 1 | 0 | 0 |
| Total exécuté sans double compte des campagnes ciblées | 978 | 0 | 31 |

Node : `node --test --test-concurrency=2 tests/*.test.mjs`, 80 798 ms.
Python : 4 765 ms ; campagne native : 9 305 ms. OpenSpec strict : 20/20 avant
archive, 19/19 après synchronisation. Syntaxe : Node --check et py_compile.
Les campagnes ciblées et reprises intermédiaires ne sont pas additionnées.
Les défauts intermédiaires de fixture, dépendance de moniteur et empreinte
historique sont décrits dans VALIDATION.md ; seule la dernière suite est sans
échec. Sources et empreintes des preuves : [qualification.json](qualification.json).

## 5. Accès web et effets externes

Aucun accès web documentaire requis. Précontrôles de production uniquement en
lecture : revue PA01 et instance historique Vite. Aucune sonde métier, nouvelle
invocation Vite ou correction manuelle du ledger. Publication et CABU suivent
cette archive ; leur réussite ne découle pas des tests. Statistiques web : N/A.

## 6. Bilan, impacts et limites

Source CAB 2.2.4 qualifiée. Refus natifs auditables, annulation revue avant
consommation, coordination d’un port quiescent prouvé par deux nouveaux probes
et extension additive disjointe sous CAS. Les anciennes once ACK et issues
natives inconnues restent honnêtes ; aucun résultat historique n’est fabriqué.
Le développeur intervient hors périmètre ; les reprises dans le change restent
à l’orchestrateur. Dépendances Debian standard, aucun paquet ajouté ; schéma 4
conservé. Les clôtures métiers PA01 et C12 restent aux propriétaires après
activation ; aucune résolution n’est revendiquée par la seule qualification.
