# Statistiques — réconciliation d’une discovery historique CAB

## 1. Statistiques générales et décisions

Session SCM directe sur le projet CAB ; l’agent de codage, le modèle exact,
la version, le fournisseur, le niveau de raisonnement, les temps de service,
tokens, coût et quotas initiaux/finals ne sont pas mesurés par cette collecte
et sont `N/A`. La version source commune passe de 2.1.37 à 2.1.38. Aucun code
de lot n’est attribué ; l’attribution reste ultérieure. Les sondes de
performance ne sont pas applicables à cette session SCM directe.

## 2. Types de messages et d’outils

Les échanges et appels d’outils n’ont pas été collectés exhaustivement ; leurs
totaux et résultats par catégorie sont `N/A`. Le travail a utilisé des lectures
ciblées, des modifications CAB, OpenSpec, des vérifications et des tests. Les
totaux natifs de messages, outils et permissions sont `N/A`, non instrumentés.

## 3. Fichiers modifiés

Le périmètre comprend le contrôleur CAB, les tests de récupération et de
distribution, le delta et la spécification OpenSpec, la référence de recovery,
les commandes et skills CAB/CABU, le changelog, les cadrages et les versions
communes. Le nombre exhaustif d’écritures et de fichiers distincts n’a pas été
mesuré séparément. Aucun fichier d’un projet consommateur ni
`ancien protocole local` n’a été modifié.

## 4. Commandes et vérifications

| Vérification finale | Résultat |
|---|---:|
| Tests JavaScript complets, série | 700 découverts : 669 réussis, 0 échoué, 31 ignorés |
| Tests Python (`unittest discover -s tests`) | 83 réussis, 0 échoué |
| Tests isolés de récupération legacy | 5 réussis, 0 échoué |
| OpenSpec strict ciblé avant archivage | Change valide |
| OpenSpec strict, tâches archivées | 109 changes validés, 0 échec |
| OpenSpec strict, spécifications principales | 16 validées, 0 échec |
| `git diff --check` avant archivage | Réussi |
| Tests natifs OpenCode opt-in | Non exécutés ; sans session de qualification dédiée |

La qualification démontre qu’une discovery native unique, exacte et
horodatée avant `request_validation` est réconciliée dans une recovery RUN
legacy après redémarrage. Les cas de doublon, troncature, absence d’horodatage
et divergence restent refusés sans mutation. Les récupérations signées
conservent leur garde stricte.

## 5. Accès web

Aucun appel aux outils de recherche ou de consultation web n’a été effectué.
Les accès Git éventuels de publication SCM sont des opérations distinctes et
ne sont pas comptés comme accès web de développement.

## 6. Synthèse globale

CAB 2.1.38 permet à `complete` de réconcilier au plus une discovery Code Mode
native en lecture seule, exacte, complète, non tronquée et horodatée dans le
transcript post-prepare d’une récupération RUN historique non signée, quelle
que soit sa position. L’approbation, l’unique permission consommée,
`/usr/bin/true` avec exit 0 et la readiness finale sans pending restent
obligatoires. Aucune demande, décision, permission, retry ou commande n’est
rejouée. Les références aux projets consommateurs restent absentes du
protocole CAB.

Le change OpenSpec est archivé. Au moment de ce rapport, le commit, les
publications SCM, CABU et la vérification runtime restent à constater
séparément ; aucune activation n’est déduite des tests locaux.
