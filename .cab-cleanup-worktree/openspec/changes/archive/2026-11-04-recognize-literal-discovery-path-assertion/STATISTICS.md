# Statistiques — CAB 2.2.18

## 1. Statistiques générales et décisions

SCM directe corrective du 4 novembre 2026, Europe/Paris. Trois tâches
finalisées ; assertion readonly de chemin de discovery. Modèle exact,
raisonnement, durée globale, tokens, cache, coût et compte exhaustif des
échanges : N/A, export absent. Aucun agent délégué ou pilotage métier lancé.

## 2. Types de messages et d’outils

Lectures ciblées source/métadonnées, édition, tests isolés, contrôles
syntaxiques, OpenSpec, Git et CABU. Comptes et pourcentages exhaustifs
messages/outils : N/A. La lecture du wrapper réel ne crée aucune validation.

## 3. Approbations, refus et fichiers

Client V2 : helper de chaîne pour la seule assertion readonly, variable/index
et chemin de catalogue liés au retour MCP littéral. Error ne peut être ombragé.
Tests et cadrages associés ; versions homogènes. Aucun endpoint ou permission
ajouté. Aucune acquisition, décision, once, libération, session ou fichier Pixs
manipulé par le correcteur. Mesures exhaustives d’écritures par fichier : N/A.

## 4. Tests et vérifications

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node client V2, distribution, services, recovery et CABU | 238 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode 2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 333 | 0 | 0 |

| Mesure | Valeur |
|---|---:|
| Fichiers ayant passé un contrôle syntaxique | 71 |
| Tâches OpenSpec prouvées et terminées | 3 |

Régression initiale en échec, puis corrigée ; relances ciblées non additionnées.
La dernière vérification couvre l’ombrage de Error. Chemin/variable/index,
constructeur/message dynamiques, suffixe supplémentaire et metadata divergente
restent refusés. Syntaxe 60 Node et 11 Python ; UTF-8/LF ; OpenSpec strict
20/20 avant archive, canonical après. QUALIFICATION.md trace les preuves.

## 5. Accès web et effets externes

Aucune recherche web supplémentaire. La fixture native isolée sous fournisseur
synthétique admet pendant running le wrapper avec assertion de chemin exacte,
sans timeout/poll manuel, puis conserve toutes ses gardes de once et effets.
Le wrapper réel PA01 déjà terminé est reconnu par GET seulement ; aucun
rejeu ni effet métier de qualification. Publication/CABU autorisés séparément.
Comptes exhaustifs des accès : N/A.

## 6. Bilan, impacts et limites

La forme bornée items[0].path !== chemin fixe puis throw Error littéral est
qualifiée après search, avec le même binding et le même retour MCP exact.
Les quotes simples sans échappements et les chaînes JSON sont couvertes.
Aucun JavaScript arbitraire n’est évalué. 17 corrigeait await seul et ne
couvrait pas cette instruction supplémentaire ; 18 qualifie le wrapper réel,
sans réémettre ses identités. Les acquisitions partagées restent requises
et les anciennes coordinations REJECTED demeurent distinctes. Les protections
historiques ne sont ni relâchées ni déclarées réconciliées par ce correctif.
