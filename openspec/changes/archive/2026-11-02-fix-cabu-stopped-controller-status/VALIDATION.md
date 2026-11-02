# Qualification SCM — CAB 2.2.3

## Mandat et périmètre

Correctif sous SCM et incrément explicitement demandé par le développeur,
suivi de publication, CABU et information des sessions. La modification
fonctionnelle porte uniquement sur la confirmation de fin du principal :
MainPID=0 avec inactive ou failed. Aucun arrêt métier, nouvelle autorité,
réécriture du RUN ou assouplissement de l’adoption n’est autorisé.

## Matrice de cohérence

| Sujet | Réalisation | Preuve |
|---|---|---|
| Fin réelle | MainPID nul, état inactive/failed | nouveau test avec sortie simulée failed et certificat adopté |
| Processus vivant | active/deactivating et PID vivant non acceptés | prédicat explicite, scénarios et tests CABU existants |
| Continuité | adoption exacte toujours requise | campagne CABU, tests de certificats absents/divergents conservés |
| Distribution | 2.2.3 commune aux modules, unités, plugins, commandes | tests de distribution |
| Compatibilité | schéma 4, mandats et accès inchangés | suites Node/Python et campagne OpenCode |
| Activation | distincte de la qualification source | preuves CABU relevées après publication |

## Résultats

Campagne CABU ciblée 87/87 réussie. Syntaxe 81 Node et 11 Python.
Dernière suite globale : 861 cas, 829 réussites, 1 échec de démarrage d’une
fixture contrôleur avant le corps du test, 31 ignorés ; 83 212 ms. Le seul cas
échoué (« un RUN indécis ne bloque pas le gate d’un autre ») a ensuite réussi
isolément, 1/1, sans changement du produit. Le refus de bail transitoire décrit
ci-dessous ne se reproduit plus dans cette dernière suite.

Bilan par cas unique après cette reprise : 830 Node validés, aucun échec
résiduel ; 31 opt-in ignorés. Le résultat global initial n’est pas présenté
comme une exécution globalement sans échec. Python : 93/93 ; OpenCode réel :
1/1, 9 258 ms. Total final unique validé : 924. Les résultats et empreintes
conservent la campagne globale et la reprise séparément.

## Frontière PA01 conservée

La source inclut les corrections 2.2.1 et 2.2.2. La preuve réelle d’annulation
PA01 reste refusée sur deux shells natifs aborted : cette version ne transforme
pas ce statut en absence d’effet. Aucun CANCELLED ou NO_EFFECT n’est fabriqué.
L’état et les informations nécessaires à cette qualification sont transmis
au propriétaire avec le résultat réel de CABU.

## Stabilisation du contrôle concurrent

Une première suite globale a eu un refus temporaire test-reconciliation-effect-pending
sur un test qui appelait la restitution pendant la vérification native de reprise.
Le même cas isolé réussit. La fixture attend désormais uniquement la disparition
de ce refus prévu, avec le même identifiant de réconciliation idempotent ; les
autres erreurs restent des échecs. Aucun garde du produit n’est assoupli.
Une dernière suite globale vérifie cet état avant la livraison.
