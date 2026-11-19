---
name: CABU
description: Actualiser le paquet Debian CAB et vérifier le service sur le même reçu.
---

# CABU 3.2.26

CABU vérifie automatiquement les modes des seuls chemins publics du paquet et
ses versions embarquées avant APT. Un payload privatisé ou périmé est refusé
avant installation ; ne pas relancer l'installation pour contourner ce refus.
Les données privées, secrets et profils restent hors de ces contrôles de modes.
Un nouveau relais peut remplacer son worker confirmé arrêté après négociation
observée, même sans notification initialized. Cela ne prouve pas la première
adoption d'un ancien relais encore en mémoire : vérifier le consommateur réel.

Le reçu distingue paquet/service vérifiés et connecteurs MCP. RECONNECTING
attend la frontière sûre ou le catalogue ; RELOAD_REQUIRED indique une reprise
native nécessaire pour un ancien connecteur sans relais. Garder le même
request_id et ne pas réinstaller. La première reprise
d'un ancien programme déjà en mémoire ne peut pas être fabriquée par CAB.
Les connecteurs supervisés rechargent leur moteur sans rejouer les appels ;
le relais maintient l'attente CABU pendant son propre remplacement.

Sur demande explicite ou dans la livraison CICD CAB autorisée, appeler l’outil
MCP `cab_update` avec un request_id stable et la version cible demandée, ou
version vide pour la release officielle courante. Aucun sudo client et aucun
RUN ne sont nécessaires. Tout client CAB actif authentifié est admis, sans
liste de comptes ; le service root porte uniquement cette opération bornée.

CAB orchestre seul les étapes via cab-update.service, distinct de cab.service.
L’outil attend mécaniquement le même reçu pendant le redémarrage. Une réponse
perdue, un délai client ou ADMISSION_UNCONFIRMED impose `cab_update_status`
avec le même request_id ; ne jamais créer une nouvelle demande pour contourner
un état inconnu. `state=OK` et `version` prouvent paquet configuré, santé READY
et finalisation vérifiée. FAILED/UNKNOWN ne sont pas des réussites.

Si le client MCP chargé ne fournit pas ces outils, signaler le client ancien
et son besoin de rechargement natif, sans modifier les configurations à la main.
Le parcours administratif `sudo cab update` reste disponible pour l’amorçage
initial de cette capacité ou une intervention explicitement demandée.

Le paquet arrête cab.service à frontière sûre, installe les runtimes publics
hors réseau, applique les migrations d’une base déjà initialisée, redémarre et
vérifie le service sur le même reçu. PostgreSQL reste indépendant. Ne jamais
réinitialiser ou restaurer un état ancien après un effet incertain. Une absence
de reçu ne prouve pas une absence d’effet.

Distinguer version du paquet, version active et état Web. Une installation
neuve expose le parcours8790 sans créer sa base. Le développeur initialise par
le Web ; ne pas inventer son compte ou son mot de passe.

L’installation APT/DIU appelle aussi la finalisation locale `sudo cab finalize` :
plugins, skills et commandes CAB sont activés pour les UID configurés puis le reçu
est enregistré. Cette commande ne télécharge ni ne réinstalle le paquet. La répéter
reprend les profils incomplets et vérifie les contenus déjà installés. Avant la
validation Web initiale, les effets par compte restent différés.

Depuis3.2.7, l'API native enregistrée est prioritaire sur l'arrêt du worker.
Un effet natif UNKNOWN conserve la protection sans rejeu ni escalade. L'état
COMPLETED du contrôle technique ne suffit pas : CABU observe aussi moteur et
catalogue cible. Les Codex déjà ouverts en stdio exigent une première adoption
du socket ; cab native-prepare ne fabrique pas ce raccordement.

## Reprise nécessaire à CABU

Une demande CABU autorisée couvre aussi la reprise nécessaire de son instance
observée, pour le même demandeur, UID, request_id et version. Ne pas redemander
une confirmation pour cette seule reprise. Lire recovery_authorization dans
le même reçu ; AUTHORIZED est une autorité bornée, pas une preuve de reconnexion.
La préférence native reste prioritaire. Une reprise administrative contrôlée
du frontend n'est admise qu'en dernier recours RELOAD_REQUIRED, avec identité
kernel stable, frontière sûre de tous les acteurs du compte, PIDFD, reçu durable,
supervision indépendante et sortie prouvée avant relance. Aucun arrêt arbitraire
ni injection dans un canal privé. L'absence de mécanisme qualifié est un blocage
technique explicite, pas une raison de redemander l'autorisation déjà donnée.

Le propriétaire ou l'administrateur peut révoquer cette autorité par
`native.control.configure` avec `cabu_recovery_authorized=false` ; seule cette
préférence change, sans appel fournisseur ni nouvelle génération. Les reprises
en attente sont revérifiées sous verrou avant dispatch. Un effet UNKNOWN, une
instance divergente ou une révocation bloque sans rejeu. Un ancien reçu sans
observation kernel n'acquiert aucune autorité rétroactive par simple lecture.
