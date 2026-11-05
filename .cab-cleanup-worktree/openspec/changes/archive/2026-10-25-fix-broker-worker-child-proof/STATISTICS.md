# Statistiques SCM — filiation multithread du broker

## 1. Statistiques générales et décisions

Session directe SCM. Validation humaine « Je valide » sur le contrôle de filiation à tous les threads du même OpenCode, avec gardes conservées, tests, archivage, poursuite locale et reprise des CISMP. Version de base 1.10.1 conservée. Tokens, quotas, modèle exact et durée intégrale : N/A, non relevés. Aucun skill de statistiques pilotées invoqué.

## 2. Types de messages et d'outils

Messages et outils exhaustifs : N/A, absence de sonde initiale. Tests Node ciblés : 46 réussis, 0 échec final, 0 ignoré. Le nouveau test a d'abord reproduit le défaut avant correction. Les deux scénarios Docker à UID réels sont distincts de ces 46 et ne sont pas additionnés au total Node. La suite 371/0 de l'archive précédente n'est pas recomptée.

## 3. Fichiers modifiés

11 fichiers source/tests/supports contrôlés par empreinte dans PREUVES-SCM.json. Une spécification synchronisée, les artefacts du change archivés, qualification, preuves et ce rapport. Aucun broker source Python, état métier, ancienne release ou reçu privé modifié par le correctif. Aucun Git inspecté, préparé ou publié. Lignes modifiées : N/A, aucun diff Git effectué.

## 4. Commandes

Trois contrôles node --check et un py_compile réussis. Banc deux UID réels : succès puis réponse de déconnexion perdue, avec broker créé depuis un thread secondaire, 40 RUN et 256 ressources par RUN. Pour chaque scénario : HTTP 5 218 572 octets, privé 5 657 012 octets ; quatre composants 1.10.1, OpenCode et PAUSE préservés, sources inchangées et écriture broker interdite par le noyau. Refus d'absence, multiplicité, UID/entrée divergents et parent altéré couverts. Lecture locale du nouveau contrôle réussie sans effet. Validation OpenSpec stricte ciblée et archive réussies : une exigence ajoutée, aucune modification/suppression/renommage d'exigence.

## 5. Accès web

Aucune recherche documentaire externe. API loopback de qualification et lecture locale de preuve uniquement ; compteur exhaustif HTTP : N/A, non mesuré. Docker network=none ; aucun compte ou droit hôte modifié. Aucun environnement brut, secret, argv brut ou génération fournisseur transmis.

## 6. Synthèse globale

La source reconnaît le broker unique depuis tout thread du même processus OpenCode, avec les contrôles stricts conservés et recontrôle du parent. Les sources qualifiées ne prouvent pas seules la libération de maintenance ni la reprise des CISMP : ces opérations restent distinctes. Les mesures absentes sont motivées ; six sections UTF-8/LF et totaux vérifiés.
