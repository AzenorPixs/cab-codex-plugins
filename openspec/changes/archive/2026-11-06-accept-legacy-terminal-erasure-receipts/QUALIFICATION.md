# Qualification vitale — CAB 2.3.10 — 6 novembre 2026

- Tests ciblés :105/105 réussis,0 échec, environ2,24s. Scope/manager/effacement intégré et cohérence de distribution uniquement. Aucune nouvelle campagne générale Node/Python ou OpenCode réel, conformément à la priorité explicite du développeur.
- Syntaxe :130 fichiers couplés JS/Python, UTF-8/LF et empreintes source vérifiées.
- OpenSpec strict :22/22 avant archive.

Le format legacy a été confronté à la source distribuée1.10.11 : completeNative écrivait COMPLETED/finishedAt/completionDigest, mais nativeResult uniquement pour les baux de test. finishAccess refusait les effets non terminés et persistait la libération. Aucun statut natif ni exit0 n’est déduit par le nouveau lecteur.

La lecture seule d’une copie de la projection actuelle C12 reconnaît ses35 reçus COMPLETED sans nativeResult, sous les deux liaisons propriétaires exactes. Le port .03 est laissé à son reçu spécifique existant ; cette lecture partielle n’a créé aucune transaction et ne remplace pas le prepare réel.

Tests adversariaux : owner étranger, inventaire périmé/altéré/dupliqué, job armé, gate final absent, historique non attribuable, completionDigest absent, once non acquittée, permission/call/target absent, dates incohérentes, accès non libéré ou mal lié, releaseDigest absent, résultat explicite null et bail de test sans résultat sont refusés. Les branches TERMINÉ/BLOQUÉ multi-owner avec legacy vont jusqu’à PURGED, avec réancrage authentifié, rapports conservés et pair préservé. Le registre legacy reste inchangé avant purge.

Aucun état CAB n’a été créé pour cette SCM directe : nettoyage propre non applicable. Publication/activation et cleanup C12 seront prouvés séparément par reçus. Le grand nettoyage des autres archives est différé pour ne pas retarder2.4. Le DEVOPS généré a changé d’une ligne avant cette SCM ; ses chemins requis ont été relus et sont conservés dans la livraison.
