# Précisions lifecycle — CAB 2.2.23

## Problèmes de codage et coordination du correctif CAB

Appliquer [le suivi des incidents CAB](coding-incidents.md) : diagnostic et
récupération qualifiée dans le mandat avant toute demande de correctif.
Conserver preuves, propriétaires et permissions ; une coordination inter-chats
ou une création exige la demande explicite correspondante et respecte les
clôtures déjà décidées. Aucun incident ne réémet une once ni ne gèle les
ressources indépendantes.


## Statistiques obligatoires à chaque archivage

Les agrégats /statistics et /runs/<runId>/statistics préparent un brouillon individuel à six sections. Les consultations de fenêtres et imports sont décrits dans references/concurrent-runs.md. Préparer pendant le travail, publier avec les accès ciblés et finaliser le rapport après libération des protections métier. Les anciennes /integration et /integration-request sont refusées dans le profil 1.10.10 ; /publish fournit le reçu durable et l'entrée éventuelle en REPORT. Le rapport vérifié reste obligatoire avant gate et livraison, avec un mandat distinct pour ce seul fichier et N/A motivés pour les mesures absentes.

Utiliser la collecte native et les relevés initiaux autorisés à l'entrée.
Charger le skill voisin `../../coding-session-statistics/SKILL.md` pour préparer
ou finaliser le rapport, et pour les mesures initiales non couvertes nativement.
Conserver l'identité de la session, le change et les bornes.
La lecture des quotas utilise directement l'outil natif Codex, sans skill
`cgpt` externe. Toute donnée inaccessible reste `N/A` avec sa cause.

Inscrire dans les critères de fin du job la preuve de publication de
`openspec/changes/archive/<archive>/STATISTICS.md` après chaque archivage.
Après la preuve d'un archivage autorisé et réussi, obtenir le relevé final
et la fin de l'intervalle, puis faire produire le rapport par un mandat
d'édition distinct. Vérifier ses six sections, ses totaux, son encodage
UTF-8/LF et son existence avant de demander la clôture normale `TERMINÉ`.
Pour un lot, exiger un rapport par archive avec ses bornes et son périmètre.

Si l'archivage échoue, le rapport final après archivage reste en attente. Si
le rapport échoue après archivage, signaler le cycle incomplet et reprendre
le rapport avec un nouveau mandat sans réarchiver. Une donnée absente ne
dispense pas du rapport ; ne jamais inventer de mesure. Le broker et le
contrôleur restent neutres et ne produisent pas ce document à la place des
agents. Cette obligation ne remplace pas l'autorisation d'archivage.


## Restitution

Présenter chaque résultat sur une ligne :

`✅ étape — preuve`

ou

`⚠️ étape — cause précise`

Une connexion déclarée par une API ne suffit pas.
Le broker doit être interrogé par `broker_readiness`, puis le test MCP actif doit confirmer le chemin de bout en bout.


## Arrêt

- Avant tout arrêt normal, demander `POST /runs/<run_id>/job/terminal-gate` avec l'état explicite `TERMINÉ` ou `BLOQUÉ`. Si le gate est refusé, conserver le job ouvert et reprendre le pilotage ou signaler le blocage ; après validation, désarmer le contrat correspondant par `POST /runs/<run_id>/job/disarm`.
- Supprimer les heartbeats et healthchecks créés par `/CAB`.
- Fermer les clients SSE créés par `/CAB`.
- Arrêter explicitement le superviseur démarré par `/CAB`, puis le contrôleur, avec `systemctl --user stop` sur leurs services respectifs. Conserver les unités installées et inactives, sans les désactiver ni les supprimer.
- Préserver `cgpt-approval-bridge-monitor.service`, sa configuration et ses connexions propres ; le moniteur reste disponible après `/CAB stop`. Son arrêt requiert une demande explicite distincte.
- Ne pas arrêter directement `cgpt-validation` : il est géré par OpenCode.
- Ne pas fermer OpenCode ni son conteneur sans instruction explicite.

Cette procédure normale reste distincte d'un arrêt forcé explicitement demandé
par le développeur. Un prévol de récupération divergent ne permet aucun
abandon implicite de job ; un arrêt ciblé explicitement demandé par le
développeur suit la procédure distincte décrite ci-dessous.



## Supervision entre deux mandats

Pour un RUN piloté sans `currentCabMandate`, le superviseur publie `WAITING`
avec `orchestrator-mandate-required`. L’orchestrateur examine cet état puis
prépare le mandat suivant ; aucun prompt automatique n’est envoyé au codeur.
Un gate `OPEN`, une récupération achevée ou une échéance de 60 secondes
n’autorisent ni commande, ni lecture, ni édition. Un mandat déjà déclaré et
les gardes de pause, récupération, permissions et accès restent prioritaires.



## Restitution sans effet — source 2.1.32

Pour une réservation de test HELD acquise mais jamais utilisée pour une
mutation, appliquer [la procédure spécifique](unused-test-reservations.md)
avant POST /runs/<runId>/test-resources/release-unused. Elle exige autorisation
humaine ciblée, attestation exhaustive de l’orchestrateur, relecture native
complète et frontière inchangée. Aucun délai, échec SSH ou booléen isolé ne
libère l’environnement. Après mutation ou incertitude, conserver la restitution
ordinaire avec nettoyage et vérification ; aucune once n’est rejouée.
