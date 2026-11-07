---
description: Régénérer les statistiques globales du projet avec le moteur CAB
version: 2.4.6
---

Commande canonique `/SGS`, en MAJUSCULES. Répondre en français.

Le suivi continu et les consultations runtime de la cible2.4.0 suivent la
référence runtime-collection.md du skill SGS ; ils ne déclenchent pas de
REBUILD global. Vérifier le service actif et sa version avant d’annoncer la
collecte ; une mesure non raccordée reste N/A avec sa couverture.
Argument reçu : `$ARGUMENTS` ; il précise éventuellement la racine du projet,
jamais un passage implicite en mode delta ou rapport individuel.

Charger le skill `sgs` distribué dans le plugin CAB et appliquer le prompt
SGS résolu exclusivement depuis DEVOPS.md du projet cible. Une invocation
manuelle autorise toujours la reconstruction complète du global et du registre,
avec suppression préalable de l’ancien rapport selon SGS, analyse de toutes
les archives, publication transactionnelle et contrôle final.

Utiliser réellement le moteur Python du skill jusqu’au résultat vérifié.
Ne pas s’arrêter à INSPECT et ne pas démarrer CAB, OpenCode, CABU ou un pilotage.
Les modes CHANGE et DELTA sont réservés aux points d’appel des sessions de
codage déjà autorisées ; ils ne modifient pas le sens de cette commande manuelle.
