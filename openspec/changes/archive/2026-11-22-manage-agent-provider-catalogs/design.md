# Conception

Les routes Agents partagent la navigation avec un lien de retour à l’accueil. Les tableaux réutilisent les composants et styles des écrans existants. L’administration réutilise l’API actuelle des délais.

Chaque modèle est identifié par le couple fournisseur et identifiant d’origine. Des champs communs servent à la présentation et les données JSON propres à la source sont conservées par modèle. Le téléchargement public est borné, vérifié et réalisé hors des requêtes de lecture. L’enrichissement utilise des identifiants exacts dans le fournisseur correspondant ou un identifiant canonique vérifiable et ne remplace que des valeurs absentes. Le document models.dev reste en mémoire.

La migration additive crée trois tables. Un retour applicatif peut les laisser en place. Inverser la migration supprime les clés, fournisseurs et modèles enregistrés.
