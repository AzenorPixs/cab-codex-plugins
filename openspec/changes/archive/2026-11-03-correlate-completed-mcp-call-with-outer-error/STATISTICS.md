# Statistiques — CAB2.2.7

## 1. Statistiques générales et décisions

Archive :2026-11-03-correlate-completed-mcp-call-with-outer-error ; SCM directe.
Mandat :correctif, incrément, publication,CABU et remontée aux sessions.
Contrainte :fichiers projet0775, états privés hors projet, aucun replay once.

| Mesure | Valeur |
|---|---|
| Date d’archivage | 2026-11-03 |
| Modèle, raisonnement et bornes globales de session | N/A — télémétrie exhaustive absente |
| Tests finaux uniques qualifiés | 1032 réussis, 0 échec fonctionnel restant ;31opt-in ignorés |
| Tâches OpenSpec prouvées | 6 |
| Syntaxe explicite des fichiers modifiés | 78 :66Node et12Python |
| Tokens input/output, cache fournisseur, coûts et compactions | N/A — mesures de production exhaustives absentes |

Un appel réussi ne prouve pas une approbation humaine. Les timeouts de fixtures
sont des erreurs techniques intermédiaires ; aucun refus de permission humaine
n’a été déduit de ces échecs. Pourcentages par messages, outils et coûts :N/A,
les dénominateurs natifs exhaustifs manquent.

## 2. Types de messages et d’outils

Lecture ciblée, édition locale, tests Node/Python/OpenCode, OpenSpec, Git SCM,
publication et CABU autorisés. Aucun agent délégué. Nombre et ventilation
exhaustifs des messages/appels par rôle :N/A — export absent.

## 3. Fichiers modifiés

Contrôleur, contexte de validation, broker transitoire, layout privé et migration,
updater, superviseur, client et fermeture d’import, versions, commandes, cadrages,
références et tests. Quatre exigences ajoutées, une modifiée dans controller-transport.
Aucune dépendance ajoutée. DEVOPS.md régénéré par DIU, sans édition manuelle.
Inventaire exact :chemins du commit SCM ; lignes et écritures :N/A.
Les anciens fichiers privés réels sont copiés par CABU, jamais versionnés.

## 4. Commandes et validations

| Vérification finale | Réussites | Échecs qualifiés restants | Ignorés |
|---|---:|---:|---:|
| Node, cas uniques qualifiés | 937 | 0 | 31 |
| Python, unittest de référence | 94 | 0 | 0 |
| OpenCode natif V2 réel | 1 | 0 | 0 |
| Total exécuté sans double compte | 1032 | 0 | 31 |

La dernière suite Node globale contient967cas :935réussites,1timeout de setup,
31ignorés,180319ms ; le cas manquant passe isolément. Le test réseau ajouté
ensuite est inclus dans937, sans compter deux fois les campagnes ciblées.
La campagne migration finale donne5/5 ; le dernier contrôle statut/stockage
5/5. Python94/94,4745ms ; OpenCode1/1,9313ms, fournisseur synthétique loopback.
Les deux autres campagnes globales ont aussi rencontré des timeouts de setup
sur des cas différents, passés en relance isolée. La cause reste indéterminée ;
aucune suite globale entièrement verte n’est affirmée. Détails :VALIDATION.md.
OpenSpec strict20/20avant et19/19après archive. Empreintes :qualification.json.

## 5. Accès web et effets externes

Documentation officielle OpenAI/Anthropic consultée pour les réponses sur
contexte, cache et compaction ; nombre exhaustif d’accès :N/A.
Précontrôle runtime réel en lecture seule :un PENDING attesté, registre API/disque
identique, aucune permission native en attente. Aucune décision ou édition Pixs
manuelle. Publication/CABU et remontée aux propriétaires suivent l’archive ;
leurs preuves ne découlent pas des tests source. Aucun secret versionné.

## 6. Bilan, impacts et limites

CAB2.2.7 qualifie l’attente transitoire de preuve native, le diagnostic filtré et
la migration privée compatible avec les fichiers projet0775. La reprise
protégée conserve identités, once et incertitudes, puis active le reçu exact.
Le premier passage est explicitement LEGACY ; après copie, reprise en avant.
Le stockage privé résout le conflit DIU/permissions sans modifier DIU. Les
anciens effets inconnus restent protégés et les récupérations métiers restent
aux orchestrateurs propriétaires. Les performances et gains de cache LLM de
production ne sont pas mesurés. Durée de coupure réelle :N/A avant CABU.
