---
name: CABU
description: Actualiser le paquet Debian CAB et vérifier le service sur le même reçu.
---

# CABU 3.2.4

Le reçu distingue paquet/service vérifiés et connecteurs MCP. RECONNECTING
attend la frontière sûre ou le catalogue ; RELOAD_REQUIRED indique une reprise
native nécessaire pour un ancien connecteur sans relais. Garder le même
request_id, ne pas réinstaller et ne pas tuer Codex/OpenCode. La première reprise
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
