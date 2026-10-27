# Conception

## Séquence de mise à jour

1. Valider le plugin complet, les versions, imports, syntaxes, destinations et
   empreintes ; préparer le reçu et les sauvegardes privées.
2. Ne pas interroger les RUN, permissions, coordinations globales ou états des
   unités pour décider de poursuivre.
3. Arrêter systématiquement controller, supervisor et monitor avec systemd.
4. Remplacer atomiquement les fichiers des quatre briques, y compris les trois
   modules broker dans la destination déclarée.
5. Exécuter `systemctl --user daemon-reload`, puis démarrer systématiquement
   les trois unités, même si elles étaient inactives avant l'update.
6. Si OpenCode répond, tenter le rechargement natif du broker et collecter sa
   readiness. Si OpenCode est absent, conserver les fichiers broker mis à jour
   et rapporter son runtime `INDISPONIBLE`.
7. Vérifier les versions et workspaces des trois services systemd, puis
   produire le rapport séparant fichiers et processus.

## Reprise et repli

Le journal privé conserve les versions de source, les destinations, empreintes,
sauvegardes, étapes d'arrêt, remplacement, redémarrage et rapport broker. Un
échec après mutation restaure seulement les fichiers sauvegardés, recharge
systemd et redémarre les trois unités. Il n'altère aucun état métier de RUN.
Après succès, les trois services systemd sont actifs sur la version cible ; le
runtime broker peut rester `INDISPONIBLE` si OpenCode ne répond pas.

## Association de la distribution

Le manifeste du plugin référence `skills/`. Le skill `approval-bridge` porte
la procédure de maintenance et la référence détaillée `component-update.md`.
La commande canonique `CAB.md` décrit `/CAB update`; `CABU.md` charge le
fichier frère de même version et déclenche l'update jusqu'au rapport terminal. Les tests
de distribution vérifient versions, chemin du skill, référence et délégation
de l'alias.

## Qualification

Les tests utilisent des contrôleurs, OpenCode et systemd simulés. Ils ne
modifient aucun service réel. La qualification sur l'installation réelle
exige un gel sans transaction étrangère, tous les RUN suspendus et une
readiness native observable.
