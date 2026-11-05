# Statistiques — CAB 2.2.19

## 1. Statistiques générales et décisions

SCM directe corrective du4 novembre2026, Europe/Paris. Change ciblé
withdraw-rejected-attached-shell, code non attribué ; normalisation ACL ultérieure.
Temps global, modèle exact, raisonnement, tokens, cache, coût et export exhaustif
des échanges : N/A. Aucun agent délégué ni pilotage métier lancé.

## 2. Types de messages et d’outils

Lectures ciblées, preuve réelle par GET, édition, suites de tests, contrôles
syntaxiques, OpenSpec, Git et préparation CABU. Comptages exhaustifs et
pourcentages messages/outils : N/A, pas d’export complet. Aucun nouveau mandat
ou appel natif à effet depuis le correcteur.

## 3. Approbations, refus et fichiers

Contrôleur, preuves recovery, registre et offres de reprise : retrait isolé du
shell avorté refusé avec ACK204. Parent conservé, enfant CANCELLED, APPROVED
historique, sans nativeResult/once/NO_EFFECT fabriqués. Tests, documentation,
skill, commande et versions distribuées cohérents. Fichiers/états métier Pixs
inchangés par le correcteur ; pas de once, accès, libération ou SID manipulés.
Comptages exhaustifs d’écritures par fichier : N/A.

## 4. Tests et vérifications

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, recovery, distribution et CABU | 643 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode 2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 738 | 0 | 0 |

| Mesure | Valeur |
|---|---:|
| Fichiers ayant passé un contrôle syntaxique | 73 |
| OpenSpec strict avant archive | 20/20 |
| OpenSpec strict après archive | 19/19 |

Les37 tests de distribution relancés après correction des attentes de version
et empreintes sont inclus dans643 ; aucun double compte. Les échecs initiaux
de fixture ou de distribution ne sont pas des échecs finaux. Voir QUALIFICATION.md.
L’activation réelle et le résultat métier ne sont pas déduits des tests source.

## 5. Commandes et accès web

Tests Node, unittest Python, py_compile, node --check, OpenSpec strict,
inspections Git et GET techniques de diagnostic. Publication puis CABU relèvent
des étapes de livraison distinctes. Comptes exhaustifs par commande/URL : N/A.
Aucun secret affiché, aucun appel de permission once par le correcteur.

## 6. Bilan, limites et reproductibilité

738 tests finaux uniques réussis. Source qualifiée pour le retrait ciblé,
pas suppression universelle des états bloquants. Révision, propriétaire,
frontière instable, preuve absente ou effet commencé restent protégés.
Les autres coordinations historiques REJECTED et les critères produit C12
restent distincts. Logs et contrôles sont référencés dans QUALIFICATION.md.
Les métriques LLM absentes restent N/A, aucune économie de cache inventée.
