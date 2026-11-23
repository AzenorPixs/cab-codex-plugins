# Diagnostic de l’authentification des forges

Code non attribué.

## Contexte

La console d’authentification affiche `ConnectError` sans indiquer à quelle étape la connexion a échoué. Pour la forge GitLab configurée sur les projets `pfd` et `pldap`, la résolution DNS aboutit depuis CAB et la connexion TCP sur le port 443 expire avant TLS.

## Changement

Afficher les étapes de transport et la cause identifiable de l’échec avec les mêmes libellés pour GitLab, GitHub et Forgejo. Couvrir la vérification du profil et les vérifications de secours sur le dépôt. Conserver les règles de vérification TLS et la signification des états d’authentification.
