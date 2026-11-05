# Statistiques — CAB 2.2.20

## 1. Statistiques générales et décisions

SCM directe corrective du4 novembre2026, Europe/Paris ; change
reconcile-not-admitted-after-broker-transition, code non attribué.
Temps global, modèle exact, raisonnement, tokens, cache, coût et export
exhaustif des échanges : N/A. Aucun agent délégué ni pilotage métier lancé.

## 2. Types de messages et d’outils

Lectures ciblées, prototype en lecture seule du transcript natif, édition,
tests isolés, syntaxe, OpenSpec, Git et préparation de livraison.
Comptages et pourcentages exhaustifs messages/outils : N/A, export absent.
Aucun prompt ou appel natif à effet lancé sur les RUN métier.

## 3. Approbations, refus et fichiers

Contrôleur, preuve et offre recovery, broker source et distribué : absence
readiness transitoire503, incompatibilité explicite409, retrait NOT_ADMITTED
sans décision et sans effet qualifié. Contrat, cadrages et versions cohérents.
Terminal broker conservé ; aucune réouverture ou décision fabriquée.
Aucun état, protection, SID, once ou fichier Pixs modifié par le correcteur.
Comptages exhaustifs d’écritures par fichier : N/A.

## 4. Tests et vérifications

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur, registre, preuve, client, distribution et CABU | 666 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 762 | 0 | 0 |

| Mesure | Valeur |
|---|---:|
| Fichiers ayant passé un contrôle syntaxique | 72 |
| OpenSpec strict avant archive | 20/20 |
| OpenSpec strict après archive | 19/19 |

Les58 tests réexécutés après la garde finale sont inclus dans666, non ajoutés.
Les échecs de qualification initiaux sont résolus, pas des échecs finaux.
Voir QUALIFICATION.md pour la portée des fixtures et la preuve historique.

## 5. Commandes et accès web

Node --test/--check, unittest et py_compile de référence, OpenSpec strict,
Git et GET techniques natifs. Publication puis CABU appartiennent au cycle
de livraison distinct. Comptes exhaustifs par commande/URL : N/A.
Aucun secret affiché et aucun once envoyé par le correcteur.

## 6. Bilan, limites et reproductibilité

762 tests finaux uniques réussis. Le correctif distingue interruption de
readiness et incompatibilité réelle, et qualifie une convergence locale
sans rouvrir le terminal natif. Une décision, un accès ou un effet contradictoire
reste protégé ; les anciens rejets et critères produit sont distincts.
L’activation et la reprise métier ne sont pas déduites des tests source.
Métriques LLM absentes : N/A ; aucune économie de tokens/cache inventée.
