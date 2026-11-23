# Conception

Le superviseur identifie le cluster local configuré et son unité systemd. Le résultat exige que la base CAB réponde à SELECT 1. Le reçu d’intention et le résultat sont écrits dans l’état privé du service pour survivre à la panne. La notification reprend la même identité dès que PostgreSQL accepte l’enregistrement.

CAB surveille ses descripteurs inotify Git et statistiques. Le noyau ne lance pas de démon inotify. CAB recrée la veille et vérifie une lecture. Un échec reste sans rejeu. Arrêter CAB d’abord pour conserver PostgreSQL volontairement arrêté.
