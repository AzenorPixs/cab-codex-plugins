# Conception

Table `cab_notifications` : identifiant stable, clé de déduplication, projet,
expéditeur calculé, titre, contenu texte, nature message/question, choix et date
de lecture. Table séparée de reçus de réponse pour consommation idempotente.
Accès et flux Electric réservés aux administrateurs authentifiés, mutations CSRF.

Ouvrir l'overview charge un instantané. Seule la notification affichée est lue.
Un message lu est supprimé transactionnellement ; une question est marquée lue
et reste en base jusqu'à sa réponse. Fermer vide uniquement l'instantané local.
Les notifications jamais affichées et questions sans réponse restent en base.
La cloche anime tant qu'une notification non lue existe, avec réduction de
mouvement respectée. Navigation précédente/suivante et fenêtre vide accessibles.

Les livraisons CAB produisent une notification par livraison, mise à jour pendant
le parcours. Une génération distincte pour l'état terminal empêche la lecture
d'un message en cours de masquer son résultat final. Aucun contenu secret ni
journal brut de processus n'est envoyé ; seuls les reçus publics CAB sont rendus.
L'API de questions propose des identifiants et libellés explicites, valide la
réponse et conserve son reçu. Aucun script arbitraire n'est porté par un choix.
