# Statistiques — CAB 2.2.21

## 1. Statistiques générales et décisions

SCM directe documentaire du4 novembre2026, Europe/Paris ; change
clarify-pilot-state-decisions-and-submission, code non attribué.
Temps global, modèle exact, raisonnement, tokens, cache, coût et export
exhaustif des échanges : N/A. Aucun agent délégué ni pilotage métier lancé.

## 2. Types de messages et d’outils

Lectures ciblées des sources, rédaction documentaire, contrôles de liens,
comparaison des moteurs, tests existants isolés, syntaxe, OpenSpec et Git.
Messages et outils exhaustifs/pourcentages : N/A, export absent.
Les retours aux propriétaires sont de la coordination autorisée, pas un effet métier.

## 3. Approbations, refus et fichiers

Deux références distribuées, liens de skill/commande/index/noyau et cadrages,
clarification de fraîcheur et versions. Moteurs et gardes inchangés hors version.
54 situations documentées ; aucune promesse de résoudre par analogie un cas
inconnu. Aucun fichier, état, décision, once, accès ou bail Pixs manipulé par
le correcteur. Comptages exhaustifs d’écritures par fichier : N/A.

## 4. Tests et vérifications

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node distribution, client, coordination, recovery et CABU | 309 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 405 | 0 | 0 |

| Mesure | Valeur |
|---|---:|
| Fichiers ayant passé un contrôle syntaxique | 70 |
| OpenSpec strict avant archive | 20/20 |
| OpenSpec strict après archive | 19/19 |
| Liens relatifs vérifiés | 188 |
| Situations de la grille | 54 |

Les54 situations ne sont pas54 exécutions de tests. Voir QUALIFICATION.md
et COVERAGE.md ; aucune nouvelle assertion textuelle en miroir ajoutée.

## 5. Commandes et accès web

Node --test/--check, unittest et py_compile de référence, OpenSpec strict,
inspections Git et préparation de publication/CABU. Comptes exhaustifs par
commande/URL : N/A. Aucun secret affiché ni réponse native once par le correcteur.

## 6. Bilan, limites et reproductibilité

405 tests uniques réussis ;57 fichiers runtime identiques hors version au
paquet précédent. Skill3911octets, commande3408octets, commande+status9791octets.
Ces tailles ne prouvent aucune économie facturée. Mesures LLM absentes : N/A.
La source documente les voies connues et la conservation des protections pour
l’inconnu ; activation et résultat métier restent à vérifier séparément.
