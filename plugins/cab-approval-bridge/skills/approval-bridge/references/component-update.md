# Mise à jour des briques actives — CAB 1.7.1

`/cab update` utilise `scripts/cgpt-approval-bridge-update.mjs` depuis le plugin
installé. Son invocation explicite autorise le cycle de maintenance des briques
CAB ; l'exécution d'une session SCM ne déclenche pas cette procédure réelle.

## Cibles et prérequis

Résoudre les seuls chemins et paramètres non secrets : plugin installé,
workspace canonique, home du compte systemd, URLs contrôleur/superviseur/Web/
OpenCode, et répertoire réellement lancé du broker. Les chemins sont absolus,
les URLs HTTP sont loopback sans identifiants. Ne pas exposer un environnement
complet ou lire un fichier sensible pour cette résolution. Une cible inconnue,
un processus manuel non géré ou une installation dans le workspace reste un
blocage explicite ; ne pas déplacer son code ou modifier sa configuration.

L'outil installe seulement les scripts nommés dans
`~/.local/share/cab-approval-bridge/`, le jeu indépendant Web dans
`~/.local/share/cab-approval-bridge-monitor/{scripts,web-monitor}/`, les modules
broker dans son répertoire désigné et les trois unités systemd utilisateur.
Le broker peut partager le répertoire des scripts, les fichiers restent
distincts. Les variables, configurations env, drop-ins, sources et données du
projet piloté restent conservés. Aucun script n'est exécuté depuis le paquet
pour valider son contenu : Node vérifie la syntaxe et Python compile dans un
cache temporaire privé. src/ reste l'autorité des copies broker distribuées.

OpenCode doit être accessible pour prouver la connexion MCP. Si le broker ou
le superviseur fonctionne, le contrôleur doit être accessible. Une instance
active doit appartenir à l'unité attendue, avec le chemin ExecStart attendu,
et le registre doit confirmer son workspace et le protocole resource-scoped-v1
avec schéma 4. Une incompatibilité de runtime exige une maintenance distincte.

## Transaction et reprise

Le journal privé se trouve sous
`~/.local/state/cab-approval-bridge-update/`. Un verrou exclusif couvre les
briques partagées du profil. L’autorité utilise un
verrou flock tenu par le helper Python déjà distribué. Sa fermeture libère
l'autorité, même après interruption ; l'inode reste en place et n'est jamais
supprimé pour forcer une opération concurrente. Le journal doit être valide
avant toute récupération.

Le paquet complet est vérifié puis sauvegardé. Les empreintes des fichiers
installés sont recontrôlées avant remplacement. Une dérive externe bloque la
transaction sans écraser cette modification. L'intention de gel est persistée
avant la requête de maintenance. DRAINING ferme les nouvelles admissions ;
l'outil ne décide aucune permission et attend que les mandats, effets et
permissions en cours soient réconciliés. HELD est confirmé par le contrôleur.
Une attente bornée retourne code 2 et conserve les processus et le gel.
Relancer la même commande pour reprendre cette transaction.

Sous HELD, l'outil arrête les briques actives, déconnecte le broker par le MCP
natif, remplace atomiquement les seuls artefacts, recharge systemd et rétablit
les états actif/inactif initiaux. Il ne démarre pas OpenCode, ne crée aucune
session et n'active aucune unité au login. Les pauses déjà demandées ne sont
pas levées. Les schémas métier ne sont pas migrés.

Le succès exige les versions propres aux composants relancés et les mêmes
identités, générations, réservations et propriétaires de demandes. Une version
broker doit provenir d'une readiness reçue après reconnexion. Le gel est levé
seulement après ces preuves. Une transaction déjà conforme ne redémarre rien.

## Retour arrière

Une erreur après le début des arrêts déclenche le retour aux seuls artefacts
sauvegardés, puis aux états initiaux. Les fichiers runtime, décisions consommées,
RUN et archives ne sont jamais restaurés depuis une ancienne copie. Un échec
de repli conserve le gel et la phase ROLLBACK_FAILED ; ne pas annoncer un succès.

Une nouvelle invocation récupère d'abord la transaction interrompue. L'option
`--rollback`, avec les mêmes cibles et URLs, permet un repli explicite. Pour une
transaction restée WAITING, cette option attend une frontière sûre puis lève
seulement son gel : aucune modification externe survenue pendant l'attente
n'est écrasée. Une libération de maintenance ambiguë est réconciliée avant toute
autre action ; si le gel est déjà levé, aucun repli automatique n'interrompt
des RUN susceptibles d'avoir repris.

Les sauvegardes et reçus restent privés et ne sont pas purgés automatiquement.
Le bilan sépare fichiers déployés, versions actives, inactivité, attente,
retour arrière confirmé et récupération nécessaire. Un service réel n'est pas
présenté comme vérifié sur la seule base d'un test simulé.
