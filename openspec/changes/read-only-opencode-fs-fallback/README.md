# Lecture read-only via OpenCode V2

Quand le modèle de codage ne dispose pas d’outil natif de lecture, le pilote
peut demander au contrôleur CAB une lecture, une liste ou une recherche
strictement read-only via les routes filesystem OpenCode V2. Le contrôleur
lie chaque appel au RUN, à la session et au répertoire enregistrés, puis
refuse les chemins absolus, les traversées et les sources exclues.
