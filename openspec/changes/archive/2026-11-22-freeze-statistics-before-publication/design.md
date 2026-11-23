## Cycle et historique

Chaque RUN porte sa définition de cycle. PostgreSQL conserve les passages des
étapes et sous-étapes, y compris les tentatives de publication. Les heures de
début et de fin proviennent des transitions constatées. La durée d’une étape
cumule ses passages. La durée d’un cycle complet va de son Initialisation à
sa Clôture, même si Statistiques et Publication se chevauchent.

## Limite des écritures

Après Archivage, CAB fige les mesures et donne aux deux phases leur propre
suivi. Le commit de publication prend le code qualifié. Les constructions
lisent son arbre dans un espace privé. Si le change prévoit un commit, CAB
committe les seuls rapports effectivement écrits par Statistiques, à partir
de leurs empreintes. La Clôture enregistre les reçus validés.

## Synchronisation

Le serveur filtre les flux Electric par projet et RUN ou change autorisé.
Les vues récupèrent les détails à chaque évolution des lignes observées.
Les données absentes restent vides dans l’Overview.
