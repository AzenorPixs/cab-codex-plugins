# Conception

Ajouter runs.cycle_summary (JSON, vide par défaut). Le producteur de projections temporelles construit et persiste la synthèse avec le même verrou et contrôle de révision que les ventilations. Electric diffuse ce champ dans la projection RUN existante ; le client invalide les requêtes puis affiche la synthèse persistée, sans compteur local.

Le nombre inclut toutes les itérations enregistrées du RUN. Les cumuls additionnent les durées connues des cycles terminés, complets ou interrompus, jamais les sous-étapes parallèles. Les champs de couverture distinguent une mesure partielle d’un historique entièrement mesuré. Une itération ouverte conserve ses bornes manquantes et sa durée inconnue. Le dernier cycle est celui au numéro le plus élevé. Aucune date n’est inventée.

La migration ne modifie aucune trace ; le producteur existant rattrape progressivement les RUN historiques. Le retour de migration retire seulement la synthèse dérivée après sauvegarde. Le format de durée existant est partagé par les actions et les compteurs.
