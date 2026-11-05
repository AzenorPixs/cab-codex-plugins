# Statistiques SCM — correctif reuse-readonly 1.9.0 vers 1.10.0

## 1. Statistiques générales et décisions

Correctif direct Codex autorisé par la réponse humaine Faire corriger et qualifier par le chat CAB, vérifiée dans 1CISMP2. Version de base conservée à 1.10.0. Source et déploiement restent distincts. Modèle exact, quotas, tokens et durée totale : N/A, non relevés ; aucun skill de statistiques pilotées invoqué.

## 2. Types de messages et d'outils

Messages et appels exhaustifs : N/A, absence de compteur initial. Lectures ciblées, édition, tests Node, Docker et OpenSpec observés. Le test de régression 1.9.0 a échoué avant correction puis réussi après ajout de la seule version manquante. Aucun refus de sécurité n'a été neutralisé.

## 3. Fichiers modifiés

Production : broker-artifact-proof.mjs, ajout de 1.9.0 à la liste fermée uniquement. Tests : active-component-update.test.mjs et helpers/readonly-broker-two-uid.mjs. Documentation : component-update.md et CHANGELOG.md. Un delta active-component-update et cette archive sont inclus. Aucun secret, cache Codex, état métier ni ancienne release n'est modifié. Lignes Git : N/A, Git non inspecté.

## 4. Commandes

20/20 tests Node réussis, 0 échec final ; 3 vérifications node --check réussies. Banc Docker dédié exécuté avec deux UID réels : succès et réponse de déconnexion perdue, tous deux réussis. Quatre briques 1.9.0 au départ, quatre 1.10.0 après mise à jour dans le banc ; OpenCode, artefacts broker, PAUSE et UID préservés, refus kernel d'écriture prouvé. Les trois sources broker 1.9.0 de fixture sont reconstruits avec SHA256 exactement égal au relevé initial ; aucun original hôte n'est restauré. OpenSpec global strict 15/15 avant archive. Archivage unique réussi : 1 exigence ajoutée, aucune modification/suppression d'exigence existante. Le contrôle global après archive est exigé avant maintenance.

## 5. Accès web

Aucune recherche web supplémentaire pour le correctif. Lecture des métadonnées publiques de publication et API locales pour la mise à jour ; aucun appel fournisseur LLM. Compteur exhaustif HTTP : N/A, non relevé. Le banc Docker utilise network=none et son loopback interne.

## 6. Synthèse globale

Le défaut 1.9.0 omis est corrigé sans accepter les versions inconnues ni assouplir identité, manifeste, processus, PAUSE ou HELD. Le rapport possède six sections UTF-8/LF et ses totaux sont contrôlés. La correction source seule ne prouve pas la mise à jour réelle des services. La maintenance réelle, puis la reprise des CISMP autorisée par le développeur, restent à vérifier séparément ; leurs reçus ne seront pas confondus avec ces preuves isolées.
