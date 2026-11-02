# Conception

## Normalisation bornée

Lorsqu’un wrapper direct appelle `tools["cgpt-validation"].request_validation(...)`, le client examine l’unique `toolCalls` natif complet. Il peut remplacer un identifiant JavaScript nu présent uniquement dans la propriété de premier niveau `requestId` par la valeur chaîne de ce call natif. Le parseur continue d’accepter uniquement des données littérales pour tous les autres champs et refuse les appels, statements, accès de propriété, interpolations, calculs ou autres valeurs dynamiques.

Après cette substitution ciblée, l’objet doit être égal à l’input complet de `toolCalls` selon une comparaison canonique des clés d’objets, en conservant l’ordre des tableaux. Le wrapper doit rester `executed=false`, non tronqué et complet ; la liste native doit contenir exactement le seul appel direct attendu avec un état compatible.

## Comparaison de l’identité

Le contrôleur compare l’identité native comme des données JSON structurées plutôt que comme la sérialisation d’objets dont l’ordre des clés n’a aucune signification. Les valeurs et la structure restent exactes, y compris l’ordre des tableaux, les révisions, les ressources et tous les identifiants.

Les empreintes et digests persistés gardent leur algorithme et leur format courants. Seule la comparaison de corrélation utilise l’égalité structurelle.

## Effets

La projection sert uniquement à corréler et enregistrer la demande native. Elle ne crée aucune décision, permission, acquisition d’accès ou réponse `once`. Les accès `HELD` restent protégés ; les conflits de ressources continuent d’attendre leur réconciliation.
