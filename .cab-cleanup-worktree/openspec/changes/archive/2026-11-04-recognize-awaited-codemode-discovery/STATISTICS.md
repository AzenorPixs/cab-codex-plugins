# Statistiques — CAB 2.2.17

## 1. Statistiques générales et décisions

SCM directe corrective du 4 novembre 2026, Europe/Paris. Trois tâches
finalisées. Périmètre : projection du seul préambule const/await/search
readonly, avec entrée MCP littérale. Modèle exact, raisonnement, tokens,
cache, coût, durée globale et compte exhaustif des échanges : N/A, export
absent. Aucun agent délégué ni pilotage métier lancé par le correcteur.

## 2. Types de messages et d’outils

Lectures ciblées de source et métadonnées, édition, tests isolés, contrôles
syntaxiques, OpenSpec, Git et CABU. Comptes et pourcentages messages/outils
exhaustifs : N/A. Les GET de diagnostic ne constituent pas une décision.

## 3. Approbations, refus et fichiers

Client V2 : await optionnel dans le binding const de search existant. Tests
unitaires et fixture native ciblés ; références et cadrages associés ; versions
homogènes. Aucun nouveau endpoint, garde ou droit natif. Le correcteur ne
poste ni décision, once, acquisition, retrait ou mutation dans les RUN Pixs.
Les fichiers métier restent hors de ce correctif. Mesures exhaustives des
écritures par fichier : N/A.

## 4. Tests et vérifications

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node client V2, distribution, services, recovery et CABU | 237 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode 2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 332 | 0 | 0 |

| Mesure | Valeur |
|---|---:|
| Fichiers ayant passé un contrôle syntaxique | 71 |
| Tâches OpenSpec prouvées et terminées | 3 |

La reproduction ciblée échoue avant le patch, puis passe ; elle est incluse,
non additionnée au total final. Troncature, entrée divergente, code ajouté,
ombrage de tools et query dynamique restent refusés. Syntaxe 60 Node et
11 Python, UTF-8/LF ; OpenSpec strict 20/20 avant archivage et canonical après.
QUALIFICATION.md détaille les preuves et les limites.

## 5. Accès web et effets externes

Aucune recherche web supplémentaire. La fixture native utilise un fournisseur
synthétique et un runtime isolé : pendant le blocage MCP, la projection est
visible et la validation admise avant toute décision, sans timeout ou poll
manuel de rattrapage. Les gardes existantes puis l’unique once privée sont
vérifiées par la suite. Aucun effet Pixs de qualification ; publication et
CABU autorisés possèdent leurs reçus distincts. Accès exhaustifs N/A.

## 6. Bilan, impacts et limites

La forme await search n’attend plus la metadata finale pour être qualifiée
si elle respecte la grammaire bornée. Cela ne valide ni entrée dynamique ni
JavaScript arbitraire et ne permet aucun rejeu d’identité. La clôture des
anciennes coordinations REJECTED reste distincte et n’est pas annoncée comme
livrée. Les demandes déjà admises continuent sur leurs mêmes identifiants,
sous la revue et l’autorité métier de leur orchestrateur. Publication,
activation des quatre composants et résultat métier sont séparés.
