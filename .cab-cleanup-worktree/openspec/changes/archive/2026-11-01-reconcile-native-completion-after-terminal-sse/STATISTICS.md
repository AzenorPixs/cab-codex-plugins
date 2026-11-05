# Statistiques — fin native réconciliée après SSE terminal

## 1. Statistiques générales et décisions

Session SCM directe ; agent Codex. CAB passe de la version commune 2.1.35 à
2.1.36. Code de lot non attribué ; attribution ACL ultérieure. Quatre tâches
terminées sur quatre. Modèle exact, niveau de raisonnement, durée exhaustive,
tokens et coût : N/A, non mesurés.

## 2. Types de messages et d’outils

Lectures ciblées, édition du contrôleur, de tests et de documents OpenSpec,
commandes de vérification. Totaux exhaustifs de messages et d’appels d’outils :
N/A, non instrumentés. Aucun accès web externe ; aucune permission native réelle.

## 3. Fichiers modifiés

Contrôleur SSE, tests du contrôleur et test natif OpenCode, delta et spécification
`controller-transport`, cadrages et changelog, commandes, skills, unités,
manifestes et constantes de version des briques CAB/CABU. Le décompte exhaustif
des chemins n’a pas été mesuré indépendamment des fichiers alignés pour la
version commune.

## 4. Commandes et vérifications

| Vérification finale | Résultat |
|---|---:|
| Tests Node sous `tests/`, chemins explicitement listés | 692 cas distincts : 662 réussis, 0 échoué, 30 ignorés |
| Banc natif OpenCode 2.2.5 isolé | 1/1 réussi ; ce cas opt-in est compté comme exécuté parmi les 662 réussis ci-dessus |
| Tests Python `unittest discover -s tests` | 81/81 réussis |
| Contrôles `node --check` | 34 fichiers réussis |
| `py_compile` | 11 fichiers réussis |
| OpenSpec standard global avant archivage | 17/17 réussis |
| OpenSpec standard global final après archivage | 16/16 réussis |
| OpenSpec strict global avant archivage | 17/17 réussis |
| OpenSpec strict global final après archivage | 16/16 réussis |
| Validation stricte des 107 archives | 107/107 réussies |
| Validation stricte ciblée de `controller-transport` | Réussie |

Le banc natif a vérifié la séquence réelle OpenCode 2.2.5 avec fournisseur et
projet synthétiques : shell `/usr/bin/false`, `once`, transcript final `exit=1`,
SSE terminal sans partie d’outil, puis relecture du transcript et état
`COMPLETED`. L’échec métier reste un échec ; aucune permission n’est rejouée.
Une validation stricte intermédiaire a signalé une exigence de plus de 500
caractères ; elle a été scindée en exigences courtes, puis les validations
strictes finales ont réussi.
Le lancement initial de la suite Node sans chemins explicites a tenté une
découverte sous `output/` et échoué sur une fixture historique exclue. La
validation finale a ensuite été exécutée uniquement sur les chemins sous
`tests/` : le chargement hors périmètre n’a pas été répété.

## 5. Accès web

Aucun outil de recherche web. Nombre d’accès web externe : 0.

## 6. Synthèse globale

CAB 2.1.36 relit le transcript natif aux événements SSE terminaux seulement
lorsqu’une opération de la session reste non résolue, puis applique le
validateur de preuve existant. Une preuve exacte clôt l’opération ; une preuve
absente conserve ses protections. L’archive source est qualifiée ; publication
et activation CABU restent distinctes et non réalisées dans cette session.
