---
name: cabd
description: Réappliquer et vérifier le raccourci GNOME de Codex Desktop sur le daemon local après installation ou mise à jour de ChatGPT.
---

# CABD

Sur demande explicite, exécuter `cab codex-desktop install` avec la version
de CAB qui fournit cette commande. Depuis root, CAB utilise le compte non
root déclaré dans l’agent **Codex Desktop**. En présence de plusieurs
comptes déclarés, sélectionner le compte avec `--user NOM`. Le script
`python3 -B scripts/desktop_daemon.py install` peut aussi être lancé sous
le compte GNOME. Le raccourci démarre le daemon local si nécessaire et donne
à l’application de bureau l’adresse de son socket Unix privé.

Après la prochaine relance complète par le raccourci, exécuter
`~/.local/bin/cab-desktop check` dans un chat Codex de l’application.
Le contrôle exige un ancêtre qui soit le daemon attendu et un
`sudo -n id` réussi. La vérification n’ouvre pas de shell privilégié.
`su -` suit l’authentification de l’hôte et doit rester interactif.

Après une mise à jour de Codex Desktop, refaire le contrôle. Si le raccourci
a régressé, réappliquer `install` et relancer le bureau. Si le nouveau
binaire ne répond plus sur le socket prévu, diagnostiquer cette incompatibilité.
Ne pas enregistrer de mot de passe ou changer les règles sudo de l’hôte.
