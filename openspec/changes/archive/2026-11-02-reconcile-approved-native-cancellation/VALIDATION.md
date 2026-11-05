# Qualification SCM — CAB 2.2.1

## Mandat et limites

Correctif demandé par le développeur sous SCM avec incrément, publication,
CABU puis information des sessions concernées. Développement direct ; aucun
agent de codage délégué. Aucun fichier du RUN Pixs modifié manuellement.
Code de lot non attribué ; attribution ACL à traiter ultérieurement.

## Matrice de cohérence

| Sujet | Sources | Réalisation et vérification |
|---|---|---|
| Annulation approuvée non consommée | delta opencode-v2-transport | ledger CANCELLED, décision approved conservée ; communication exécutable retirée |
| Frontière native active | registre et contrôleur | accès, native, once et décision rejetée refusent la transition ; autres opérations préservées |
| Fin native et démarrage | contrôleur SSE | réconciliation déclenchée et demandes concurrentes coalescées par RUN, sans boucle de polling |
| Attente métier | preuve native indépendante | BLOCKED/DECISION_WAIT_WITHOUT_PROGRESS n’empêche pas l’annulation prouvée sans effet |
| Bootstrap | delta distribution et références | base attendue dérivée du manifeste installé, sans valeur 2.1.81 figée |
| Distribution | pyproject, modules, unités, manifests, commandes | version 2.2.1 commune, suffixe Codex de cache distinct |
| Compatibilité | schéma 4 et tests existants | ni nouvelle clé de registre ni rejeu once ; historique conservé |
| Livraison | SCM puis CABU | preuves séparées après commit ; pas d’activation revendiquée par l’archive |

## Contrôles acquis

- Régression reproduite avant correction : deux cas approved/PREPARED échouent
  à atteindre CANCELLED avec et sans redémarrage.
- Contrôles ciblés finaux : 23/23 réussis, avec refus accès/native/once et
  admission du mandat suivant après redémarrage.
- CABU isolé : 85/85 réussis.
- Python de référence : 93/93 réussis.
- Syntaxe : 81 fichiers Node et 11 Python vérifiés ; le contrôleur final revérifié.
- OpenSpec strict : 20/20, dont le nouveau change.

La première suite complète de préparation a détecté des versions de commandes,
unités et assertions non encore incrémentées ; elles sont alignées. La seconde
a détecté une demande de restauration perdue pendant une lecture en cours ;
le garde coalesce désormais une reprise, ce que couvre aussi la régression
existante de journal indisponible. Ces campagnes intermédiaires ne sont pas
additionnées aux mesures finales.

Les empreintes actuelles des destinations de la migration 2.2.0 sont mises à
jour dans son manifeste de couverture pour les titres et références distribués.
Les hashes, spans et versions des sources historiques restent inchangés ; cette
maintenance n’est pas une réouverture ni une nouvelle qualification de 2.2.0.

## Validation finale

- Suite Node finale : 858 tests, 827 réussis, 31 ignorés, 0 échec, 73 868 ms.
- Campagne OpenCode réelle finale : 1/1 réussie, 9 192 ms.
- Total final unique exécuté : 921 tests réussis, aucun échec.
- Les 31 tests opt-in ignorés ne sont pas présentés comme exécutés.

Les résultats ci-dessus qualifient la source 2.2.1 ; publication et activation
restent distinctes et seront attestées après commit et vérification runtime.
