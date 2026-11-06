# Qualification source — CAB 2.3.7 — 6 novembre 2026

## Bilan final vérifié

- Node : 1418 cas, 1387 réussis, 0 échec, 31 ignorés.
- Python : 193 tests réussis, aucun échec.
- OpenCode réel isolé : 2 tests réussis, aucun échec ; 2 des 31 ignorés de la campagne Node exécutés ici.
- Cas historique supplémentaire : 1 test réussi, modules réels 2.3.3, broker 2.3.5, installation classique, 128 stages, services résiduels et option managed forcée ; registre privé identique adopté sans changement d’inode.
- Bilan distinct : 1583 tests exécutés réussis, 29 ignorés. Les reprises ciblées ne sont pas additionnées.
- Syntaxe : 130 fichiers JS/Python vérifiés ; empreintes du gel source revérifiées.
- OpenSpec strict avant archive : 22 éléments validés, 0 échec.

## Propriétés vérifiées

L’inventaire complet des fichiers source est comparé aux empreintes capturées dans le même reçu. L’ordre de l’inventaire n’est pas significatif. Les octets du registre cible déjà identique, son inode et son mtime sont préservés ; les fichiers absents sont copiés. Les décisions APPROVED et once acquittées restent identiques. Une interruption après copie reprend le même reçu.

Registre étranger, fichier auxiliaire divergent ou étranger, preuve d’une autre transaction, source modifiée après capture, inventaire incomplet, mode non privé et lien symbolique sont refusés avant adoption. Modifier ensemble source et cible après capture ne permet pas de remplacer l’empreinte antérieure. Le contrôleur normal garde son refus de collision sans preuve explicite. Aucune purge ni réinitialisation des décisions.

## Limites et livraison

Les journaux de qualification sont dans output/scm-registry-adoption/ (non versionnés). La qualification du portable réel reste à effectuer sur cette machine après publication. Aucun état CAB n’a été créé pour cette SCM directe : nettoyage terminal CAB non applicable. C12 continue sur les services actifs 2.3.6 ; le CABU local 2.3.7 est différé jusqu’à une frontière sûre, sans prétendre activer cette version.

Un essai de procédure groupée pour les sondes C12 a été refusé par le contrôleur 2.3.6 : run-mandate-already-active. Cet essai hors campagne produit n’est pas une procédure qualifiée ni une régression du correctif ; il a été écarté et signalé à C12. Aucune action métier n’a été émise.
