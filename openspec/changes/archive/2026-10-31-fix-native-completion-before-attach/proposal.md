# Réconcilier la fin native avant rattachement

Code non attribué ; attribution ACL ultérieure. CAB 2.1.31 actualise les fins natives avant le rattachement d'une opération approuvée à un accès toujours détenu. Une fin native prouvée ne garantit pas le succès de la commande. Préserver la décision explicite, les preuves natives, la portée, les révisions, le jeton, le fencing et les protections. Aucune nouvelle API d'annulation ni permission implicite.

Extension validée : après redémarrage, une réponse MCP native APPROVED strictement corrélée peut être vérifiée sur demande pour rattacher une opération préparée en vue de son annulation. La décision n’est pas rétablie comme permission exécutable ; historique stable et session inactive sont exigés.
