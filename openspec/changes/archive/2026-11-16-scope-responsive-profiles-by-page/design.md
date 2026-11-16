# Conception — code non attribué

Chaque page est identifiée par son chemin sans paramètres de requête. Les références locales non renseignées valent 100 % pour chaque profil. Les valeurs effectives sont le produit des références locales interpolées et des multiplicateurs globaux interpolés. Une commande de la barre modifie un seul champ de la page courante via une opération atomique ; les autres pages sont préservées. Les paramètres globaux et ceux des pages sont persistés dans les préférences existantes, puis synchronisés via leur projection Electric.

Le mode développeur est désactivé par défaut lors d’une installation neuve et son activation est réservée à un administrateur. Les anciens clients n’écrasent pas les références locales qu’ils ne connaissent pas.
