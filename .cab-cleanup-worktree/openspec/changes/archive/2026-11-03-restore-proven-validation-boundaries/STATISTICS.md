# Statistiques — CAB 2.2.5

## 1. Statistiques générales et décisions

Change archivé : `2026-11-03-restore-proven-validation-boundaries`, SCM directe.

| Agent | Modèle de LLM | Niveau de raisonnement |
|---|---|---|
| Codex, codage direct | N/A — télémétrie native exhaustive absente | N/A — non mesuré nativement |

| Mesure | Valeur |
|---|---|
| Date d’archivage | 2026-11-03 |
| Début et fin de session | N/A — bornes globales non instrumentées |
| Durée totale et hors pauses | N/A — interruptions non mesurées |
| Tests finaux uniques | 998 réussis, 0 échec ; 31 tests opt-in ignorés |
| Tâches OpenSpec prouvées et terminées | 6 — préparation SCM ; publication et CABU attestés séparément |
| Fichiers distincts touchés | 133 |
| Fichiers syntaxiquement valides | 100 fichiers distincts : 89 Node et 11 Python |
| Tokens, cache, coût et compactions de production | N/A — télémétrie exhaustive non exposée |

Mandat explicite du développeur : correction SCM, incrément, publication,
CABU et remontée aux sessions. Aucun RUN/job/SID Pixs modifié manuellement.
Les propriétaires appliqueront les reprises après activation vérifiée.

## 2. Types de messages et d’outils

Lectures ciblées, édition locale, tests Node/Python/OpenCode réel, OpenSpec,
Git SCM et information des sessions autorisée par le développeur. Aucun agent
délégué ; les fixtures ne constituent pas des agents de développement.
Messages/appels exhaustifs par rôle : N/A — export absent.

## 3. Fichiers modifiés

Contrôleur, contexte, preuves de recovery, registre et policies ; versions,
manifestes, unités, commandes, références et cadrages ; tests HTTP et attentes
de distribution ; trois exigences OpenSpec synchronisées. Aucune dépendance.
Sources historiques de migration conservées ; seules les empreintes des
destinations actuelles sont actualisées. DEVOPS.md existant n’est pas édité
manuellement. Inventaire exact : chemins du commit SCM après publication.
Lignes/écritures : N/A — métrique exhaustive non collectée.

## 4. Commandes et validations

| Vérification finale | Réussites | Échecs | Ignorés |
|---|---:|---:|---:|
| Node, suite globale finale | 904 | 0 | 31 |
| Python, unittest de référence | 93 | 0 | 0 |
| OpenCode natif réel V2 | 1 | 0 | 0 |
| Total exécuté sans double compte des campagnes ciblées | 998 | 0 | 31 |

Node : node --test --test-concurrency=2 tests/*.test.mjs, 88 195 ms. Python :
4 774 ms ; natif V2 : 9 439 ms. Les 20 tests HTTP nouveaux sont inclus dans
la suite et ne sont pas additionnés. OpenSpec strict : 20/20 avant archive,
19/19 après synchronisation. Syntaxe Node --check et Python py_compile :100fichiers.
Les erreurs intermédiaires d’alignement, de fixtures et l’invocation erronée
d’un banc natif historique sont conservées dans VALIDATION.md. La dernière
suite globale est réellement sans échec. Sources et empreintes des preuves :
[qualification.json](qualification.json).

## 5. Accès web et effets externes

Aucun accès web documentaire nécessaire. Diagnostics de production en lecture
seule : PENDING PA01 et terminal CISMP5. Aucun prompt métier, permission,
annulation ou commande n’a été envoyé par le correcteur. Le précontrôle du
terminal réel passe ; la lecture PA01 doit être rafraîchie en retour direct.
La publication et CABU suivent cette archive ; leurs succès ne découlent pas
des tests. Statistiques web : N/A.

## 6. Bilan, impacts et limites

Source CAB 2.2.5 qualifiée. La restauration PENDING ne crée aucune décision ;
le terminal de lecture clôt uniquement la coordination avec permission
historique explicitement non prouvée. Aucun once, nativeResult ou NO_EFFECT
n’est fabriqué. Les sources, révisions, identities et effets divergents restent
refusés ; les reçus et identifiants sont stables après perte de réponse et
redémarrage. Schéma4 conservé. Une ancienne version ignore les nouvelles
actions de policy : ses gardes restent dégradées plutôt que réinterprétées.
L’expiration PA01 n’est pas prolongée. Publication, activation et résolutions
métiers sont attestées séparément après le commit.
