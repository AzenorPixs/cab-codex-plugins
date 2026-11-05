## Contexte et autorité

SCM direct CAB, version source 1.9.0. L'accord humain vérifié couvre création,
réalisation et qualification de ce seul complément. Les archives L1/L2 restent
inchangées. Aucun appel au runtime consommateur n'est nécessaire aux tests.

## Interface

Le profil ordinaire accepte brokerPolicy=reuse-readonly (CLI --broker-policy)
avec brokerProof fourni par --broker-proof-file privé 0600, propriétaire de
l'acteur. Sans option, la politique installation existante reste inchangée.
Le profil gelé refuse cette option ; ce n'est pas un moyen d'élargir M2.

La preuve désigne authorization, entry, expectedUid/expectedGid, manifest
exact des trois modules Python, loadedVersion, instanceId, opencodeProcess
et brokerProcess (pid/startTime/uid). Le chemin réel, les types sans liens,
les propriétaires et empreintes sont contrôlés. Le processus broker doit
être l'enfant attendu d'OpenCode et lancer cette entrée ; aucun environnement
ou argument non nécessaire n'est exposé. Les fichiers correspondent au paquet
1.9.0. Une dérive suspend l'opération.

Les sources broker sont seulement lues ; aucune écriture, compilation dans
leur répertoire, sauvegarde restaurable, nouvelle release ou bascule de lien
broker n'est effectuée. La compilation de validation utilise le cache privé
de transaction. Les services restent sous leur compte ; OpenCode relance son
enfant MCP sous son propre compte sans changement de configuration.

## Frontière de maintenance

Tous les RUN restent sous PAUSE explicite, sans récupération/mandat/permission
ou effet non réconcilié. La maintenance acquiert le vrai HELD ordinaire.
Le journal distingue version d'artefacts, version chargée avant maintenance,
ancien processus/instance et nouveau processus/instance après reconnexion.

Avant le premier appel de déconnexion, le journal persiste l'intention et la
frontière non réversible du processus. Après cette intention, toute erreur ou
interruption conserve le gel et signale une récupération nécessaire. Aucune
restauration des sources externes ni annonce de rollback vers 1.7.1 n'est
permise. Une reprise du même journal vérifie autorité, HELD, identités et
artefacts, puis poursuit vers le jeu 1.9.0. Une dérive ne crée pas une nouvelle
transaction pour contourner le gel. Avant cette frontière, les mécanismes de
repli compatibles des artefacts de services restent disponibles.

Le succès exige versions actives propres aux trois services, nouveau broker
de version cible, readiness fraîche reçue après reconnexion, même processus
OpenCode et mêmes identités/réservations/jobs/pauses. Le métier nécessite sa
propre reprise explicite. Un service inactif conserve son état initial.

## Qualification

Tests de preuve : identité, liens/hardlinks, manifeste, propriétaire, processus
divergents, absence totale de mutation des sources. Tests transactionnels :
version sur disque 1.9.0 avec processus 1.7.1, refus avant arrêt, crash avant
et après intention, reconnexion ambiguë, échec de version, gel durable, reprise
et absence de faux rollback. Régression complète des modes existants.

Le banc à deux UID utilise le conteneur de test autorisé par DEVOPS avec
sources d'entrée montées en lecture seule et espace de travail éphémère.
L'acteur des services et de l'outil est UID 1000 ; le serveur OpenCode simulé
et son véritable enfant broker sont UID 1002. Les comptes et permissions du
système hôte ne changent pas. Les PIDs/UID et refus d'écriture sont observés,
pas substitués par des mocks. Si ce banc n'est pas disponible, cette preuve
reste non acquise et interdit une clôture prétendant cette qualification.
