# Conception

Le profil de cycle enregistré au démarrage sélectionne le comportement du RUN. Le codeur direct ou l’orchestrateur franchit l’étape 10 sans travail CAB. À la Publication, CAB fige les sources livrables tout en poursuivant la collecte de télémétrie. La sélection Git inclut les fichiers `STATISTICS.md` et `BLOCKERS.md` du projet admissibles à la publication, avec contrôle de fraîcheur du contenu et des index.

En Clôture, la dernière validation de l’agent déclenche l’attente d’une borne native de fin de travail. CAB collecte les compteurs et durées dans la limite attestée pour chaque rôle applicable. Il génère ensuite le rapport du change, puis le rapport global. Il confirme les empreintes et ferme le RUN. Les rapports restent dans l’arbre de travail et entrent dans une prochaine publication. Aucun nouveau commit ou tag n’est créé en Clôture.

Lorsqu’une borne native est attendue, le RUN reste en finalisation. Une mesure absente à la borne attestée reste indisponible. Les reprises gardent les preuves et la protection des effets indéterminés.
