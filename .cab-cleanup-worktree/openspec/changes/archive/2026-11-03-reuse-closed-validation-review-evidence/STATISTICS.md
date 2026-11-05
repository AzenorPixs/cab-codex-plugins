# Statistiques — CAB2.2.6

## 1. Statistiques générales et décisions

Change archivé : `2026-11-03-reuse-closed-validation-review-evidence`, SCM directe.

| Agent | Modèle de LLM | Niveau de raisonnement |
|---|---|---|
| Codex, codage direct | N/A — télémétrie native exhaustive absente | N/A — non mesuré nativement |

| Mesure | Valeur |
|---|---|
| Date d’archivage | 2026-11-03 |
| Début et fin de session | N/A — bornes globales non instrumentées |
| Durée totale et hors pauses | N/A — interruptions non mesurées |
| Tests finaux uniques | 1014 réussis, 0 échec ; 31 tests opt-in ignorés |
| Tâches OpenSpec prouvées et terminées | 5 — préparation SCM ; publication et CABU attestés séparément |
| Fichiers distincts touchés | 134 |
| Fichiers syntaxiquement valides | 100 fichiers distincts : 89 Node et 11 Python |
| Tokens, cache LLM, coût et compactions de production | N/A — aucune télémétrie exhaustive ni benchmark facturé collecté |

Mandat du développeur : correction SCM, incrément, publication,CABU et remontée
aux sessions, avec autonomie dans le change et priorité temps/tokens/cacheLLM.
Aucun RUN/job/SID Pixs modifié manuellement. Les reprises réelles restent aux
orchestrateurs propriétaires après activation.

## 2. Types de messages et d’outils

Lectures ciblées, édition locale, tests Node/Python/OpenCode réel, OpenSpec,
GitSCM et information des sessions autorisée. Aucun agent délégué ; les
fixtures ne sont pas des agents de développement. Messages/appels exhaustifs
par rôle : N/A — export absent.

## 3. Fichiers modifiés

Contrôleur, preuves/reçus et contexte de recovery, classification de retrait,
versions/manifestes/unités/commandes, références et cadrages, tests et deux
exigences OpenSpec. Aucune dépendance. Sources historiques de migration
conservées ; seules les empreintes des destinations actuelles sont mises à
jour. DEVOPS.md existant conservé sans édition manuelle. Inventaire exact :
chemins du commit SCM après publication. Lignes/écritures : N/A — mesure absente.

## 4. Commandes et validations

| Vérification finale | Réussites | Échecs | Ignorés |
|---|---:|---:|---:|
| Node, cas uniques qualifiés | 920 | 0 | 31 |
| Python, unittest de référence | 93 | 0 | 0 |
| OpenCode natif réel V2 | 1 | 0 | 0 |
| Total exécuté sans double compte des campagnes ciblées | 1014 | 0 | 31 |

Suite Node globale951cas :91 945ms,920réussites/0échec. Un dernier amendement
d’indexation locale a ensuite été qualifié sur les15tests HTTP concernés et
par syntaxe, sans répéter la suite globale inchangée hors cette branche.
35tests HTTP et23unitaires ciblés sont inclus/non additionnés. Python5002ms ;
natifV2 9566ms. OpenSpec strict20/20avant archive,19/19après. Syntaxe100fichiers.
Échecs intermédiaires et limites exactes : VALIDATION.md. Sources et empreintes :
[qualification.json](qualification.json).

## 5. Accès web et effets externes

Aucun accès web documentaire requis. Précontrôle réel en lecture seule :
PA01, cinq anciennes parties reconnues, terminal exit0 qualifié sans mutation.
Le retrait CISMP5 est qualifié par fixtures, sans action du correcteur sur
le RUN. Aucune nouvelle commande, permission ou annulation native envoyée.
Publication/CABU suivent l’archive ; leurs réussites ne découlent pas des tests.
Les possibilités de cache fournisseur ne sont pas modifiées ou supposées.
Statistiques web : N/A.

## 6. Bilan, impacts et limites

Source CAB2.2.6 qualifiée. Réemploi borné des seules revues closes, retrait
propriétaire avant émission et documentation once/ports/cacheLLM. Les anciens
aborted restent UNDETERMINED_READ_ONLY ; le nouveau terminal conserve la
permission non prouvée ; le retrait ne fabrique aucun NO_EFFECT. Les anciennes
protections, leases et identités demeurent. Schéma4 conservé. La source n’efface
pas l’incertitude d’un serveur quarantiné : la continuation disjointe demande
ses propres mandats. Tokens en cache/hits/coûts/latenceLLM de production :
N/A, aucun gain inventé. Publication, activation et reprises propriétaires
sont attestées séparément après commit.
