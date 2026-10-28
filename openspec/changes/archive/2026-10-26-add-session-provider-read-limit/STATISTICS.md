# Statistiques SCM — budget fournisseur de la session, CAB 1.10.2

## 1. Statistiques générales et décisions

Session directe SCM autorisée : limite /provider configurable par la session de pilotage, incrément de toutes les briques, tests et archivage. L'instruction humaine finale réserve la mise à jour locale à la session qui la demande : aucun déploiement, gel ou redémarrage de service effectué ici. Tokens, quotas, modèle exact et durée complète : N/A, non relevés. Aucun skill de statistiques pilotées invoqué.

## 2. Types de messages et d'outils

Compteurs exhaustifs messages/outils : N/A, absence de relevé initial. Suite Node finale : 399 déclarés, 373 réussis, 0 échec, 26 ignorés (25 bancs exigeant le paquet historique 1.7.1 absent et un banc natif optionnel non activé). Python : 73 réussis. Total exécuté hors banc Docker : 446 réussis ; 26 ignorés, soit 472 déclarés. Syntaxe et scénarios Docker sont comptés séparément, sans addition des tests ciblés recouvrants.

## 3. Fichiers modifiés

68 fichiers source/tests/supports contrôlés par empreintes dans PREUVES-SCM.json : fonction du contrôleur, test HTTP, incrément commun 1.10.2 et documentation/protocole. Deltas OpenSpec, qualification et présent rapport archivés. Les archives antérieures et les données métier sont préservées. Aucun Git inspecté, préparé ou publié. Lignes modifiées : N/A, aucun diff Git effectué.

## 4. Commandes

32 contrôles syntaxiques réussis et trois copies broker identiques aux sources. Le test HTTP couvre budget exact, un octet de moins, valeur supérieure à 16 Mio, omission compatible 2 Mio, valeurs invalides avant observation, armement, limites des sessions/messages et confidentialité. Le banc Docker deux UID réels qualifie 1.10.1 vers 1.10.2 : succès et réponse de déconnexion perdue, 40 RUN et 256 ressources par RUN ; HTTP 5 218 616 octets, privé 5 657 060 octets ; quatre versions cibles, OpenCode/pauses/sources conservés et écriture broker refusée par le noyau. Aucun compte ou droit hôte modifié. Les essais initiaux ont révélé des références de version et un compteur sensible au SSE, corrigés sans désactiver les contrôles ; les exécutions finales sont réussies. OpenSpec strict avant archive : 15/15. Archivage réussi : trois exigences ajoutées ; les mentions de version courante figurent dans les deltas correspondants.

## 5. Accès web

Aucune recherche documentaire externe. API loopback synthétiques de test et observations techniques locales de préparation ; compteur exhaustif HTTP : N/A, non mesuré. Docker network=none. Aucune réponse /provider réelle sauvegardée, aucune génération fournisseur, aucun secret ni environnement brut exposé. Les marqueurs privés des tests sont synthétiques et absents des sorties et jobs.

## 6. Synthèse globale

Le change source 1.10.2 est réalisé et qualifié : providerMaxBytes fourni par la session, appliqué au seul /provider de l'appel, sans plafond fixe supplémentaire. Le défaut compatible et les autres limites sont conservés. Les sources ne prouvent aucune activation locale : elle est réservée à la session demandeuse conformément à l'instruction finale. Les six sections, UTF-8/LF et totaux sont vérifiés ; les mesures absentes sont motivées.
