# Qualification historique CAB 1.7.1 vers 2.1.5

Périmètre demandé le 28 octobre 2026 : retrouver le paquet historique authentique, aligner OpenSpec et les tests sur la cible 2.1.5 puis exécuter les 25 cas jusque-là ignorés. Aucun déploiement, activation, publication ou archivage de ce nouveau change n’est inclus.

## Provenance du paquet historique

Le commit local `e76c7e915ba0094a41b4f79fe90487c2571419dd` contient le contrôleur exact attendu par le banc. Le manifeste annonce `1.7.1+codex.20261020164727`.

SHA-256 du contrôleur :

```text
3cfb31247836605ea0f04fec4d4ff449c0fc34e8c5b5ee97382d379bfb40913b
```

Cette empreinte correspond exactement à celle déjà épinglée dans le test. La vérification établit l’identité avec cet artefact de référence et sa provenance Git locale ; elle ne prétend pas fournir une signature d’éditeur indépendante.

Les 29 fichiers publics nécessaires ont été extraits avec `git show`, sans checkout, modification de configuration Git ni lecture de données privées : scripts Node/Python, modules broker, manifeste et quatre fichiers Web. Le paquet de test reste dans `output/historical-bootstrap-2.1.5/original-1.7.1`.

- [Provenance et empreintes des 29 fichiers](../../../../output/historical-bootstrap-2.1.5/PROVENANCE.json)
- [Empreintes des sources soumises à la validation finale](../../../../output/historical-bootstrap-2.1.5/integrity-before-final.json)

Les sources historiques n’ont pas été corrigées ou renommées pour contourner une incompatibilité. L’empreinte de chaque fichier est revérifiée après les essais.

## Contrats et corrections

Trois exigences canoniques sont rapprochées de la cible explicite 2.1.5 : transition mixte bornée, frontière avant reprise métier et scénario d’artefacts déjà cibles avec broker ancien. Les garanties de PAUSE, de corrélation et d’absence de reprise métier demeurent. Le delta conserve les scénarios existants et documente les changements de version voulus.

Le premier passage a démontré un refus d’adoption : le nouveau lecteur ajoute l’annonce publique testResourceProtocol, tandis que toutes les données du registre et du job restent identiques. Le calcul d’empreinte exclut uniquement cette annonce après validation stricte de son absence ou de la valeur test-resources-v1. Les collections de réservation et tous les champs métier restent protégés. Le banc vérifie l’équivalence, le refus d’une valeur inconnue et le changement de hash lorsqu’une donnée métier est modifiée.

Les autres changements sont limités aux fixtures :

- assertion du pointeur de release alignée de 1.10.7 vers 2.1.5 ;
- credential synthétique du banc copié en fichier privé dans le profil temporaire ; aucun credential réel ;
- adaptateur de services capable de traiter toutes les unités d’un appel groupé ;
- serveur Web synthétique distinct pour tester une version incompatible ;
- injection de panne unique, sans réinjecter artificiellement la même panne pendant le traitement de l’échec ;
- preuve de processus renouvelée après disparition du broker antérieur, avec refus explicite de la preuve périmée avant la nouvelle tentative ;
- seconde vérification reuse-readonly avec preuve fraîche : résultat up-to-date sans reconnexion lorsque toutes les observations le permettent, ou nouvelle transaction completed ; le PID est contrôlé selon le résultat, les versions finales et les artefacts restent vérifiés dans les deux cas.

Les essais intermédiaires échoués restent visibles dans les journaux ; ils ne sont ni masqués ni ajoutés au nombre de cas finaux.

## Isolation

Tous les profils, journaux, credentials synthétiques et états utilisés par les essais sont sous le TMPDIR du projet. Le banc crée ses processus enfants et un serveur OpenCode HTTP/SSE simulé. Son adaptateur de services n’appelle pas le systemd utilisateur réel. Le test natif de la suite globale utilise lui aussi une instance OpenCode dédiée et jetable.

Le paquet 1.7.1 peut appeler les routes historiques uniquement dans le serveur de fixture. Le client CAB courant reste exclusivement V2 ; aucun fallback V1 n’est ajouté. Les effets de maintenance se limitent aux profils temporaires du banc. Les seules commandes de prévol exécutées par ces scénarios sont des `/usr/bin/true` isolées, sous une nouvelle permission simulée corrélée, jamais dans un RUN utilisateur.

La fermeture des enfants, des serveurs, des abonnements et des temporisateurs, ainsi que la suppression des racines temporaires, est attendue par les hooks de fin des tests. Le paquet restauré et les rapports de preuve sont conservés volontairement pour reproductibilité.

## Reproduction

Depuis la racine CAB, avec le paquet restauré et vérifié :

```sh
env PATH=/home/devops/python/current/bin:/home/devops/node/current/bin:/usr/bin:/bin \
  TMPDIR="$PWD/output/historical-bootstrap-2.1.5" PYTHONDONTWRITEBYTECODE=1 \
  CAB_TEST_ORIGINAL_PLUGIN="$PWD/output/historical-bootstrap-2.1.5/original-1.7.1" \
  /home/devops/node/current/bin/node --test tests/maintenance-bootstrap.test.mjs
```

Pour la suite complète, ajouter `CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode` et utiliser `tests/*.test.mjs`. Ce binaire ne remplace aucun serveur existant : le test natif alloue son propre port et ses répertoires XDG temporaires.

## Résultats

Les **25 scénarios de premier niveau et huit sous-tests** réussissent : **33/33, zéro échec, zéro saut** dans le passage final du banc. Les scénarios de reprise couvrent PREPARED, STOPPING, STOPPED, INSTALLED, RESTARTED, ADOPTED, VERIFIED et COMPLETED.

| Contrôle | Résultat et portée |
|---|---|
| Banc historique final | 33/33 réussis, dont 25 scénarios et huit sous-tests ; aucun saut |
| Suite Node globale avant le dernier ajustement d’assertion du banc | 494 exécutés : 493 réussis, un échec, aucun saut |
| Cause de cet échec global | La revalidation reuse-readonly pouvait légitimement effectuer une transaction completed au lieu du raccourci up-to-date ; l’assertion ne couvrait qu’une des deux issues |
| Correction et revalidation | Seule cette assertion du fichier de banc est ajustée ; chaque issue conserve ses contrôles de PID, versions, empreintes et absence de permission supplémentaire. Le fichier entier est réexécuté : 33/33 |
| Autres cas Node de ce passage global | 461 cas hors banc historique réussis ; aucun changement de source de production après ce passage |
| Python DevOps | 73/73 réussis |
| Syntaxe Node | Deux fichiers modifiés valides : banc et maintenance-proof |
| Paquet historique | Les 29 empreintes d’origine sont inchangées |

Le passage global en échec est conservé ; il n’est pas présenté comme un passage global unique vert. La revalidation finale couvre le fichier de tests modifié depuis ce passage. Les résultats ne sont pas additionnés en répétant les cas communs. Les ajouts indépendants de la session 2.1.6 ne sont pas qualifiés par ce rapport.

- [Banc final](../../../../output/historical-bootstrap-2.1.5/historical-final.log)
- [Passage global et échec intermédiaire](../../../../output/historical-bootstrap-2.1.5/node-final.log)
- [Suite Python](../../../../output/historical-bootstrap-2.1.5/python-final.log)
- [Résultats structurés](../../../../output/historical-bootstrap-2.1.5/RESULTATS.json)

Le code de production de maintenance-proof est resté identique entre le passage global et la revalidation du banc. L’unique changement ultérieur du test accepte les deux résultats documentés en conservant des invariants distincts, sans masquer un échec de maintenance. Les répertoires et processus temporaires sont contrôlés après la sortie des tests. Le paquet restauré et les journaux sont conservés comme preuves régénérables.

## Contrôles finaux

- Change ciblé : validation OpenSpec stricte réussie.
- OpenSpec global standard et strict : 17/17 chacun, aucun problème, dont deux changes actifs (qualification et travail 2.1.6 concurrent).
- Contrôle strict des tâches des archives : 74/74 ; aucune archive rejouée ou rouverte.
- Syntaxe des deux fichiers JavaScript modifiés : réussie ; diff sans erreur d’espacement.
- Douze fichiers du périmètre en UTF-8 sans BOM et LF ; 506 destinations locales vérifiées avant ajout de ce lien final.
- Les 29 empreintes du paquet historique sont inchangées ; le module de preuve de production est identique entre la suite globale et le banc final.
- Aucun processus enfant du banc ne subsiste. Les racines cab-bootstrap temporaires ont été supprimées par les hooks. Six répertoires résiduels de fixtures contrôleur de la suite générale ont été nettoyés après vérification de l’absence de processus ; paquet original et journaux conservés.

Preuve structurée : [integrity-after-final.json](../../../../output/historical-bootstrap-2.1.5/integrity-after-final.json).

Les quatre tâches de ce change sont validées. Il reste ouvert, sans code attribué : aucun archivage n’était demandé. Le registre et la cartographie portent le suivi ciblé et préservent les autres codes et les travaux de la session concurrente. Aucun déploiement, installation ou activation du profil utilisateur, aucune publication ou opération Git mutante effectué. L’exception safe.directory a été passée uniquement aux commandes Git de lecture, sans modification de configuration persistante.

Snapshot public de la cible 2.1.5 qualifiée, avant intégration 2.1.6 : `output/historical-bootstrap-2.1.5/target-2.1.5`. [TARGET-PROVENANCE.json](../../../../output/historical-bootstrap-2.1.5/TARGET-PROVENANCE.json) conserve les empreintes ; les sources du banc sont conservées sous `qualified-tests/`. Le module autonome expérimental 2.1.6, non importé par les composants qualifiés, est exclu de ce snapshot.

## Recontrôle global et archivage autorisé

Une demande humaine ultérieure a autorisé l’archivage de ce seul change après réussite d’un nouveau passage global complet, puis son rapport et les mises à jour du registre et de la cartographie, sans déploiement ni activation. Les mentions précédentes « reste ouvert » décrivent l’état avant ce mandat.

Les sources communes passant à 2.1.6 en parallèle, le passage global 2.1.5 est exécuté dans une copie complète isolée de 726 fichiers publics, issue du commit de base 7dcd49605963d9435b40a327b5f025af3390adc5 et des sources qualifiées conservées. Les empreintes sont identiques avant et après les tests. La copie n’inclut pas les travaux 2.1.6.

Résultat : **Node 494/494, Python 73/73, aucun échec et aucun saut**, soit 567 cas distincts réussis. Le banc historique 33/33 est inclus dans Node et n’est pas ajouté une seconde fois. Ce passage global complet lève la limite de revalidation partielle du passage intermédiaire antérieur, dont les preuves restent conservées.

- [Snapshot complet et empreintes](../../../../output/historical-bootstrap-2.1.5/global-recheck/SNAPSHOT.json)
- [Suite Node globale complète réussie](../../../../output/historical-bootstrap-2.1.5/global-recheck/node-full.log)
- [Suite Python complète réussie](../../../../output/historical-bootstrap-2.1.5/global-recheck/python-full.log)

Archivage natif réussi : 2026-10-28-qualify-historical-bootstrap-2-1-5. Les quatre exigences étaient déjà identiques au canon : specsUpdated=false, aucune exigence ajoutée, modifiée, supprimée ou renommée pendant cette opération. Aucun skip-specs ni contournement de validation. Après archive : OpenSpec standard et strict 16/16 chacun, archives 75/75. La session 2.1.6 conserve son change actif et son ordre d’archivage ultérieur. Rapport final : [STATISTICS.md](STATISTICS.md).

Contrôle final après rapport : neuf fichiers UTF-8/LF et liens valides, six sections statistiques ; les 74 correspondances de codes et le bloc de la session concurrente sont préservés. Aucun processus de test restant, répertoires temporaires nettoyés. [Bilan structuré final](../../../../output/historical-bootstrap-2.1.5/global-recheck/FINAL-RESULTS.json).
