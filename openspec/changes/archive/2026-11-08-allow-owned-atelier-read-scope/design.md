## Conception

Après canonicalisation des ressources par le registre existant, l’extension additive accepte exceptionnellement une lecture dont la clé est l’atelier exact du couple change/RUN ou un descendant séparé par `/`. Toutes les autres règles de namespace et de droits restent inchangées. Les vérifications de recouvrement, de conflits et de frontière sont exécutées normalement avant toute mutation ; le reçu existant assure la reprise idempotente.

Le chemin comparé est celui résolu physiquement : un lien vers un atelier tiers ne bénéficie pas de l’exception. L’extension ne crée ni approbation ni accès et ne dispense pas de contrôler le contenu, les chemins et la destination lors d’un transfert.

## Validation

Tests temporaires : lecture propre, autre RUN et préfixe voisin, écriture, lien étranger, propriétaire/digest/recouvrements, conservation d’un accès et rejeu idempotent. Les tests ne touchent pas aux RUN réels.
