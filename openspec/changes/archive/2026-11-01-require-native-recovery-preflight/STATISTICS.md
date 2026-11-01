# Statistiques — prévol natif de récupération adossée à un RUN

## 1. Statistiques générales et décisions

Session SCM directe, agent Codex ; CAB passe de la version commune 2.1.36 à
2.1.37. Code de lot non attribué ; attribution ACL ultérieure. La durée
exhaustive, les tokens et les coûts ne sont pas exposés dans les mesures de
cette session et restent `N/A`. Les jobs historiques sans RUN conservent leur
chemin précédent.

## 2. Types de messages et d’outils

Aucun comptage exhaustif des messages ou appels d’outils n’a été collecté.
Les appels de vérification ont été réalisés dans cette session SCM directe ;
leur attribution exhaustive par type est `N/A`. Aucun RUN de codage ni aucune
permission native réelle n’ont été démarrés.

## 3. Fichiers modifiés

Client Code Mode V2, contrôleur de contexte de job, broker Python et copie
source synchronisée, tests du client/broker/contrôleur/récupération,
documentation du plugin et de la commande CAB, OpenSpec, changelog, cadrages,
unités, manifestes et versions CAB/CABU. Le nombre exhaustif d’écritures et
de fichiers distincts attribuables à cette session n’a pas été instrumenté.
Les synchronisations préexistantes de `DEVOPS.md` et
`ORCHESTRATED_CODING.md` sont restées intactes.

## 4. Commandes et vérifications

| Vérification | Résultat |
|---|---:|
| Tests JavaScript (`node --test --test-concurrency=1 tests/*.test.mjs`) | 696 cas : 665 réussis, 0 échoué, 31 ignorés |
| Tests Python (`unittest discover -s tests`) | 83/83 réussis |
| OpenSpec strict ciblé avant archivage | 2/2 validations réussies |
| OpenSpec strict, spécifications principales après archivage | 16/16 éléments validés |
| OpenSpec strict, tâches archivées | 108/108 changes archivés validés |
| Tests natifs OpenCode opt-in | Ignorés sans instance de qualification |
| Tests ciblés du contrôleur de récupération | 144/144 réussis |

Les tests du contrôleur incluent discovery absente, discovery scellée avant
prepare, permission `edit:deny`, discovery tardive refusée avant notification,
timeout fini et compatibilité des jobs sans RUN. La suite Python source et
les autres suites JavaScript s’exécutent dans le bilan global ci-dessus ; les
31 tests ignorés restent exclus des réussites. Le premier passage du CLI
d’archivage a signalé 10/13 tâches, car le fichier mêlait les critères source
aux étapes externes SCM/CABU. La liste finale a été limitée aux 11 tâches de
spécification, implémentation, vérification, archivage et statistiques ; elles
sont toutes cochées et la validation stricte finale confirme les 108 archives.
Les opérations SCM/CABU restent suivies séparément.

## 5. Accès web

Aucun appel aux outils de recherche ou de consultation web n’a été effectué.
Les accès externes Git de publication et de mise à jour CABU sont des étapes
SCM/CABU distinctes, pas des appels web de développement.

## 6. Synthèse globale

Le code CAB 2.1.37 exige, pour une récupération adossée à un RUN, la découverte
native scellée de `request_validation` et les permissions `shell:ask` et
`edit:ask` avant prepare. Une discovery tardive est refusée avant l’admission
et la notification. `request_validation` attend au plus 120 secondes par
défaut et retourne le même approval ID pollable ; une notification seule ne
vaut pas décision. La compatibilité historique sans RUN demeure distincte.

Source qualifiée par les suites isolées et OpenSpec strict. L’activation CABU,
la publication SCM et l’information des sessions restent des preuves
distinctes à enregistrer après leurs étapes effectives.
