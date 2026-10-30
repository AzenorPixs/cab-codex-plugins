# Conception

Le lanceur compare import.meta.url au chemin réel de argv[1], avec résolution des liens ; l’import en bibliothèque ne déclenche pas la CLI. Les tests conservent le pipe privé et vérifient reçu/effet sur chemins canonique et lié.

La qualification utilise le binaire officiel2.2.0 déjà vérifié, un fournisseur Responses local à comptes synthétiques et des métadonnées de raisonnement factices. Le compte B rejette uniquement les métadonnées émises par A. La sonde fraîche et la session historique sont testées séparément. Les API et sources publiques2.2.0 sont examinées ; resume:false est une admission sans lancement de boucle, pas une suppression de contexte. Aucun résultat simulé n’est présenté comme application réelle.

L’adoption d’un choix natif et de son contrat ne prouve pas qu’un historique existant est portable entre comptes. Les réponses completed de la transition portent une indication constante not-verified/requiresHistoricalContinuityCheck ; le protocole impose l’échange historique sans outil avant RESUME. Si aucun parcours natif ne maintient les contraintes de la cible, documenter ce blocage et les conditions d’un autre choix explicite ou d’une évolution native distincte, sans changer la PLLM ni effacer des preuves. Ne pas inventer une API ou appliquer une bascule transitoire comme réparation.

La qualification pourra démontrer une limite plutôt qu’une réparation de l’historique : ce résultat constitue le livrable autorisé de cette unité, avec ses critères et preuve exacte. Le correctif CLI et la clarification de contrat restent indépendants et testables. Les historiques, tâches et statistiques des archives précédentes ne sont pas réécrits.
