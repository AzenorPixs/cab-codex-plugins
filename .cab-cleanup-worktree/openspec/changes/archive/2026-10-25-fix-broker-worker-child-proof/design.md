# Conception

Lire /proc/<OpenCode>/task, puis children de chaque TID numérique. Une disparition ENOENT/ESRCH d'un thread pendant le relevé est ignorée ; les autres erreurs restent bloquantes. Réunir les PID dans un Set. Chaque candidat conserve matchingChild : UID exact, PPID OpenCode exact, Python avec seul argument du point d'entrée déclaré, identité PID/startTime/UID stable. La preuve exige exactement un candidat et une identité OpenCode identique avant/après lecture. Aucun argv brut ou environnement n'est restitué.

Les tests utilisent un véritable Worker Node qui crée Python, avec absence vérifiée dans children du thread principal. Ils contrôlent aussi l'absence de candidat, deux candidats, commande et parent divergents. Le banc à deux UID conserve l'interdiction noyau d'écrire dans le broker, le même OpenCode et les pauses. Le correctif reste un module de preuve, sans nouveau paramètre runtime.

L'updater corrigé termine la transaction existante avec ses stages initiaux conservés. Une seconde maintenance ordinaire, si nécessaire pour distribuer le nouveau module lui-même, conserve les RUN en PAUSE et les anciens reçus/releases. La reprise des CISMP suit seulement la vérification du jeu réellement chargé et la libération du gel. Aucun stage ou reçu privé n'est modifié manuellement.
