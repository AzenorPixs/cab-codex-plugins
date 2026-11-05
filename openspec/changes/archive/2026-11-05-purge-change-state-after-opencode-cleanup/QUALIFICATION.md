# Qualification source CAB 2.2.40

Code non attribué ; convergence ACL ultérieure. Qualification du 5 novembre 2026.

## Résultats observés

Campagnes finales sur 77 fichiers runtime/tests figés par SHA-256 :
932 tests Node réussis, 135 tests Python réussis, un test sur OpenCode réel réussi,
soit 1068 tests produit distincts, zéro échec final et zéro test ignoré.
Vérifications syntaxiques : 64 JavaScript et 13 Python, empreintes inchangées.
OpenSpec : `openspec validate --all --strict` réussi après synchronisation des
spécifications canoniques. Les trois modules Python canoniques sont identiques
aux trois copies distribuées du broker.

Preuves locales non versionnées : `output/cleanup-qualification/publication-node.tap`,
`publication-python.log`, `publication-native.log`, `publication-freeze.json`,
`syntax-final.json` et `openspec-strict-final.log`.

Les premières campagnes ont révélé une régression de l’identité publique du
moniteur, corrigée par une route de maintenance distincte. Une campagne
concurrente a aussi rencontré un timeout du bootstrap SSE du banc avant le
payload ; le cas isolé puis la campagne finale séquentielle passent. Les
campagnes répétées ne sont pas additionnées au total final.

Le moteur SGS en développement est utilisé uniquement comme outil local de
rapport conformément au SCM courant : ses six tests CHANGE passent. Ils ne
sont pas ajoutés aux 1068 tests produit ; sa brique n’est ni publiée ni activée.

## Couverture et garanties

Branches TERMINÉ et BLOQUÉ pour dépendance, conservation du SID métier requis,
propriété des identités, exclusion des pairs, rejet des effets inconnus et accès
non libérés, frontières natives, retrait sans émission avec parent RELEASED,
réancrage HMAC, clés manquantes/altérées, projections typées, permissions 0775
sous ancêtre privé, verrous OS, crash APPLYING et reprise en avant, certificat
externe puis retrait des propres reçus, anciennes époques et propositions refusées.
Le contrôleur refuse sa restauration mutable pendant un effacement APPLYING.

## Documentation et périmètre

Skill CAB, index, références de clôture/lifecycle et commande CAB décrivent la
procédure propriétaire ; PROJECT, TECHNICAL, BUILD, README et CHANGELOG sont
amendés. AGENTS et DEVOPS restent applicables sans modification ; aucune
propagation template ni modification de project.env. Les versions distribuées
sont 2.2.40, paquet CAB/CABU 2.2.40+codex.20261105163304.

L’implémentation est isolée de la brique SGS inachevée de l’autre session.
Aucune purge de production, aucun état C12/PA01, aucune session native métier
et aucun fichier Pixs ne sont modifiés par cette qualification. Un effet
historique inconnu interdit toujours la purge. Le certificat couvre les racines
CAB gérées, sans prétendre effacer les disques/snapshots ou conversations externes.

## Livraison

L’archive qualifie la source. Commit, publication DIU, activation CABU et reprises
propriétaires ont des preuves distinctes dans DELIVERY.md ; aucun succès de
ces étapes n’est déduit des tests ou de l’archivage.
