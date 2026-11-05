# Statistiques — CAB 2.2.13

## 1. Statistiques générales et décisions

SCM ciblée : changement du SID de pilotage C12 dans le même RUN ; mandat
incrément/publication/CABU et protections existantes conservées. Code non attribué.

| Mesure | Valeur |
|---|---|
| Date | 2026-11-03 |
| Tests finaux uniques | 461 réussis, 0 échec restant, 0 ignoré |
| Tâches finalisées | 4 |
| Syntaxe vérifiée | 73 fichiers : 62 Node et 11 Python |
| Modèle, raisonnement et durée totale | N/A — export exhaustif absent |
| Tokens, cache fournisseur et coût | N/A — métriques de production absentes |

Une preuve de test synthétique ne mesure pas un gain de cache ni une reprise
métier. Publication et activation sont vérifiées séparément.

## 2. Types de messages et d’outils

Lectures ciblées, éditions, contrôles syntaxiques, suites Node/Python,
fixture native V2, OpenSpec, Git et mise à jour autorisée. Comptes exhaustifs
et pourcentages des messages/outils : N/A, export absent. Aucun agent délégué.

## 3. Approbations, refus et fichiers

La demande autorise ce cycle SCM. Le handoff ne prend aucune décision
métier ni permission native ; l’orchestrateur reste propriétaire du RUN.
Code concerné : resource-coordination, job-context et controller ; tests,
contrat distribué, commande CAB, manifests/versions et cadrages associés.
Aucun fichier métier Pixs modifié. Nombre exhaustif d’approbations de session :
N/A. Les cas de refus synthétiques prouvent les gardes, pas une décision humaine.

## 4. Tests et vérifications

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node cœur, gardes et continuité | 254 | 0 | 0 |
| Node compatibilité et distribution | 112 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode réel V2 | 1 | 0 | 0 |
| Total unique | 461 | 0 | 0 |

Les relances ne sont pas additionnées. QUALIFICATION.md trace les échecs
intermédiaires corrigés, les logs, le scénario natif et les limites.
Cœur242 cas puis12 nouveaux cas uniques de modèle/continuité ; compatibilité
revalidée après actualisation des seules empreintes documentaires courantes.
OpenSpec20/20 strict avant archive ; vérification canonique après archive.
UTF-8/LF et diff --check ; source broker et copie distribuée identiques.

## 5. Accès web et effets externes

Aucune recherche web supplémentaire. Fixture native isolée sous fournisseur
synthétique ; aucun effet de qualification dans les RUN Pixs. Publication
Forgejo/GitHub et CABU appartiennent à la livraison autorisée et ont leurs
reçus séparés. Accès exhaustifs de la conversation : N/A.

## 6. Bilan, impacts et limites

Même RUN/job/change/jalon ; nouveau SID courant seulement. Les anciens SID
restent observés et non exécutables ; les opérations et accès historiques
restent inchangés. Rejeu exact, journal durable et réparation de checkpoint
sans nouveau once ; conflit de ressource toujours opposable. Après usage du
journal, reprise en avant sans downgrade vers un lecteur ancien. Le cas write
refusé demeure un sujet distinct. Aucune activation métier de C12 n’est
inférée de la qualification ou de CABU.
