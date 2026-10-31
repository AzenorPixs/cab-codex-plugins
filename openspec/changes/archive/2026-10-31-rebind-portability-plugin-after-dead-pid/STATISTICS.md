# Statistiques — réattachement du plugin après arrêt CAB 2.1.32

## 1. Statistiques générales et décisions

SCM directe ; un agent Codex, mandat développeur pour éviter l’échec de chargement après redémarrage OpenCode sans supprimer la garde de processus. Aucun sous-agent. Modèle exact, raisonnement, durée exhaustive, tokens et coût : N/A, non instrumentés. Code non attribué ; attribution ACL ultérieure.

## 2. Types de messages et d’outils

Lectures ciblées, éditions, tests et coordination autorisée. Totaux exhaustifs messages/outils : N/A, non instrumentés. Aucune permission native réelle consommée.

## 3. Fichiers modifiés

Module de portabilité, tests de portabilité et distribution, versions communes, cadrages/CHANGELOG, OpenSpec et références de progression ciblées. Nombre exhaustif d’écritures et de fichiers distincts : N/A.

## 4. Commandes et vérifications

| Campagne finale disjointe | Réussis | Échoués | Ignorés |
|---|---:|---:|---:|
| Node global, 688 cas | 657 | 0 | 31 |
| Python global | 81 | 0 | 0 |
| OpenCode privé exact 2.2.0 | 4 | 0 | 0 |
| Total exécuté | 742 | 0 | 31 |

Tests ciblés non additionnés : portabilité6/6 et concurrent-controller139/139. Une suite globale antérieure avait échoué sur une fixture et des attentes de version obsolètes ; les attentes ont été corrigées, le contrôleur ciblé a réussi, puis la suite globale finale séquentielle a réussi. Syntaxe du module vérifiée. OpenSpec strict global 17/17 avant archive ; 16/16 après archive. Nombre exhaustif de commandes : N/A.

## 5. Accès web

HTTP local et fixtures ; aucun outil de recherche web. Totaux réseau : N/A, non instrumentés.

## 6. Synthèse globale

Le plugin peut reprendre un PID courant après redémarrage seulement si l’ancien PID n’existe plus. Un PID vivant ou un état indéterminé bloque toujours le chargement. Les règles de session ne sont pas modifiées et aucun fichier runtime utilisateur n’est écrit par le module. Source qualifiée et archivée ; publication et activation CABU restent à vérifier.
