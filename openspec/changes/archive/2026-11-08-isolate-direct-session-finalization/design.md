# Conception

Le finaliseur identifie exactement projet, change, RUN et session directs. SGS sélectionne uniquement la liaison directe correspondante et conserve les autres liaisons, les checkpoints de composants et les incidents CCAB. Un pair encore actif sur le même RUN interdit le nettoyage de l'atelier partagé. Toute liaison cible doit être fermée, possédée et présente dans le rapport durable exact ; une outbox cible non drainée empêche la purge. Les reçus sont idempotents.

Une fermeture statistique ne prouve pas l'inactivité native d'une ancienne session pilotée. La garde de ce cas reste donc active, même si ses fenêtres sont closes ; elle ne sera levée que par une autorité et une exclusion atomique de l'atelier qualifiées. Ce change ne prétend pas résoudre cette situation distincte.

