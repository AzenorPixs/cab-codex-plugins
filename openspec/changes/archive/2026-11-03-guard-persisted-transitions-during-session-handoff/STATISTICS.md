# Statistiques — CAB 2.2.14

## 1. Statistiques générales et décisions

SCM corrective du handoff autorisé, 2026-11-03. Trois tâches finalisées.
Modèle, raisonnement, durée totale, tokens, cache et coût : N/A, export exhaustif
absent. Les métriques du fournisseur synthétique ne mesurent pas la production.

## 2. Types de messages et d’outils

Lectures ciblées, éditions, contrôles Node/Python/OpenSpec, Git et CABU.
Comptes exhaustifs et pourcentages messages/outils : N/A. Aucun agent délégué.

## 3. Approbations, refus et fichiers

Mandat SCM du développeur : correction, incrément, publication puis CABU.
Garde persisté dans job-context ; documentation, tests, versions et cadrages
associés. Aucun RUN métier modifié par le correcteur. Les décisions et
permissions historiques restent intactes ; nombre exhaustif des échanges N/A.

## 4. Tests et vérifications

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node cœur et distribution | 164 | 0 | 0 |
| Node compatibilité CABU/ports/permissions | 108 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode réel V2 | 1 | 0 | 0 |
| Total unique | 367 | 0 | 0 |

Cinq nouveaux cas de restauration/actualisation readonly. Syntaxe71fichiers
modifiés,60Node et11Python. OpenSpec20/20avant archive ; canonical vérifié
après archive. Source broker/copie identiques ; diff --check et UTF-8/LF.
QUALIFICATION.md trace les commandes, preuves et le précontrôle corrigé.

## 5. Accès web et effets externes

Aucune recherche web supplémentaire. Fixture native isolée, fournisseur
synthétique. Publication et CABU autorisés ont leurs preuves distinctes.
Nombre exhaustif d’accès : N/A. Aucune mutation métier Pixs par le correcteur.

## 6. Bilan, impacts et limites

Une transition persistée reste opposable même hors appel inFlight ; le refus
ne change ni SID ni checkpoint. Après update, la même candidate readonly peut
rafraîchir sa readiness ; l’ancienne observation ne devient pas une preuve
fraîche. Protections et décisions historiques conservées. Aucun nouveau once,
effet, retrait ou NO_EFFECT. L’activation et la bascule C12 restent distinctes.
