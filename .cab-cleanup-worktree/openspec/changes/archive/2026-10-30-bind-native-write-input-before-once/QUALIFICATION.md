# Qualification — CAB2.1.22

## Contrôle et limites

Le chemin était vérifié avant once, sans comparaison des arguments à une donnée structurée approuvée. Le correctif ajoute tool_input_sha256 au mandat fichier ; broker/retry/décision le conservent, l’identité concurrente le lie conditionnellement sans modifier les digests historiques. L’empreinte est dérivée par le client de la source native SID/message/call/cible vérifiée ; une métadonnée libre ne fournit aucune preuve. Le contrôleur invalide une divergence avant replyPermission once et expose blockedNativeInputs, sans décision reconstruite ni permission consommée.

Le champ est optionnel pour compatibilité des anciens mandats ; le protocole exige sa présence pour les prochains write/edit. Aucun ancien mandat n’est annoncé protégé. La lecture supplémentaire des arguments pour les permissions absolues est demandée explicitement pour les seuls mandats protégés, afin de préserver les anciens budgets de lecture et comportements. Le résultat du fichier reste vérifié après effet ; formatter, shell et outils non qualifiés ne sont pas couverts implicitement.

## Banc exact

Binaire officiel2.2.0 déjà vérifié, serveur privé, fournisseur synthétique, broker réel, contrôleur et permissions ask/once. write exact et edit exact réussissent ; un request_validation APPROVED au même chemin suivi de write divergent est bloqué avant once, permission native encore pendante et fichier inchangé. Le rejet natif explicite termine cet appel sans effet. La garde ne change pas rétroactivement l’APPROVED du contenu initial.

La première extension du banc avait conservé son accès HELD puis tenté un prévol ultérieur : la garde existante access-extension-while-held a correctement refusé. Le scénario divergent est donc exécuté après les autres scénarios du banc ; son accès reste protégé jusqu’au nettoyage du seul environnement privé. Aucune garde ou assertion produit n’est relâchée.

## Résultats finaux

Node637 cas antérieurs plus2 nouveaux :639cas uniques,609réussis,30ignorés conditionnels,0échec ; groupes132/132 concurrent (33,668122s) et477réussis/30ignorés sur507autres (55,863538s). Python81/81 (5,023s). Trois bancs natifs2.2.0 explicites3/3 (14,685036s), distincts des cas ignorés par défaut. Les ciblés ne sont pas additionnés au global. Syntaxe66JavaScript/16Python, copies broker identiques, UTF-8/LF ; quatre fichiers protégés aux empreintes du baseline. OpenSpec avant archive17/17 standard/strict et cible stricte valide. Les résultats après archive sont consignés dans PREUVES-SCM.json.

Sources officielles et contrat : packages/plugin/src/promise/tool.ts et corps natifs2.2.0. Aucun hook d’exécution supplémentaire n’est nécessaire : l’interception est à la frontière existante de la permission, avant once. Aucun compte/modèle/historique réel ou fichier métier modifié par la qualification. Les cas réels rapportés par PA10 puis PA01 restent des preuves des propriétaires, distinctes du banc. Aucun code de lot attribué ; cartographie ciblée et statistiques globales maintenues selon SCM, sans modifier les rapports historiques.
