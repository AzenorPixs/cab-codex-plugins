# Conception

La grammaire existante fournit l’appel littéral sans exécuter le programme. L’exception concerne seulement un appel attendu broker_readiness avec objet vide et aucune découverte, dans une enveloppe completed/executed=false, truncated=false et sans erreur. La seule entrée observée doit correspondre au même outil avec status completed et ne posséder aucune propriété input. Une propriété présente, même undefined dans un double local, n’entre pas dans cette exception.

Les métadonnées natives restent inchangées ; seule la projection des arguments utilise l’objet déjà prouvé par le programme. envelopeHash reste calculé sur l’enveloppe brute, donc distingue omission et input explicite. Les arguments non vides gardent leur comparaison exacte ; les autres outils, erreurs, expressions, appels ajoutés et sources incohérentes conservent execute. Il ne s’agit ni d’une décision ni d’une autorisation implicite.
