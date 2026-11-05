# Conception

Le contrôleur complète son repli de corrélation CodeMode brut. Il accepte un
wrapper `execute` V2 non exécuté, `status=completed`, complet et non tronqué,
dont les métadonnées native toolCalls contiennent un unique appel final
`cgpt-validation.request_validation` terminé avec l'identité native exacte.
Un seul `search` achevé peut précéder cet appel. Aucun autre outil, input
divergent ou appel répété n'est admis.

La voie normalisée reste inchangée. Cette preuve ne décide pas, ne crée pas de
permission et ne change pas la sémantique des demandes terminales.
La référence du prévol précise que les méthodes MCP découvertes s'appellent
dans le wrapper `execute` de Code Mode ; elle ne demande aucun changement de
catalogue ou de permission native.
