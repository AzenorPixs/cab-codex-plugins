# Statistiques — CAB 2.2.26

## 1. Statistiques générales et décisions
SCM corrective directe du4novembre2026 ; code non attribué.
Temps global, modèle exact, raisonnement, tokens/cache/coût et export
exhaustif : N/A. Aucun agent délégué ni pilotage métier lancé par le correcteur.

## 2. Types de messages et d’outils
Lectures filtrées du transcript/API, revue de classification, correction client
et contrôleur, régressions HTTP, documentation, OpenSpec, syntaxe, Git et
préparation CABU. Comptages exhaustifs et pourcentages : N/A.

## 3. Approbations, refus et fichiers
Provenance native read dérivée, classification bornée d’observation non mutante,
références/cadrages et versions. Aucun appel write/shell supplémentaire ignoré.
Le rejet edit, sa décision et le reçu de retrait409 restent historiques.
Aucun RUN, accès, bail, permission ou once Pixs muté par le correcteur.
Comptages exhaustifs des éditions par fichier : N/A.

## 4. Tests et vérifications
| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, client V2, ports, recovery, distribution et CABU | 649 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 745 | 0 | 0 |

12nouvelles régressions incluses dans649Node, sans cumul des essais ciblés.
Une fixture négative legacy devenue vrai read par normalisation du serveur
factice a été corrigée vers un outil usurpant read ; voir QUALIFICATION.md.
70fichiers syntaxiques,242liens, UTF-8/LF et0775 vérifiés. OpenSpec20/20 avant
archive,19/19 après.55fichiers runtime inchangés hors version, deux modifiés.
Nom publicCAB conservé ; convention générique hyphen-case non revendiquée.

## 5. Commandes et accès web
Node --test/--check, unittest/py_compile de référence, OpenSpec strict,
GET ciblés et transcript natif via client authentifié, Git et préparation
publication/CABU. Comptages exhaustifs par commande/URL : N/A.
Aucun secret affiché, aucune once ou commande Pixs lancée par le correcteur.

## 6. Bilan, limites et reproductibilité
745tests uniques finaux réussis ; voir QUALIFICATION.md et logs privés.
Skill3964octets, commande3581octets, commande+status9964octets : budgets respectés.
Aucun gain facturé déduit. Lecture native qualifiée ne signifie ni permission
de lire hors mandat ni équivalence d’un outil inconnu. Les gardes du retrait,
du parent, de la once et des effets incertains restent conservées.
Publication/activation26 et succès réel du retrait restent distincts de la source.
