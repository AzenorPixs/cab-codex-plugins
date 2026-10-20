# Préparation du rapport d’archivage SCM

Projet : Codex Approval Bridge (`cab`). Version source : 1.6.0.

## 1. Statistiques générales et décisions

Qualification Node : 273 réussis, 0 échec, 1 ignoré, total 274.
Qualification Python : 59 réussis, 0 échec, total 59.
Total distinct : 332 réussis, 0 échec, 1 ignoré, total 333.
Deux navigateurs qualifiés, sans addition aux tests unitaires.
Syntaxe : 24 fichiers JavaScript et 8 Python, total 32.
OpenSpec avant archivage : 11 éléments valides en mode strict.
Archivage : en attente de l’exécution autorisée.
Tokens, coûts, TTMT, débits et quotas : N/A, télémétrie pilotée non déclenchée en SCM.

## 2. Types de messages et d’outils

Lectures ciblées, éditions locales, tests, navigateurs headless et OpenSpec.
Aucun pilotage OpenCode ou sous-agent de codage. Services de test isolés.

## 3. Fichiers modifiés

Inventaire final et matrice documentaire à joindre après synchronisation.
AGENTS.md et DEVOPS.md inchangés par comparaison d’empreintes.

## 4. Commandes

Node --test --test-concurrency=2 tests/*.test.mjs : code 0.
Python unittest discover : code 0, dont Python 3.14.8 de DEVOPS.md.
node tests/web-monitor-browser.mjs : code 0 pour Chromium et Firefox.
Syntaxe, UTF-8/LF et contrôle OpenSpec strict : code 0.
Échecs intermédiaires : deux attentes de version et une fixture navigateur corrigées ; exigence OpenSpec raccourcie après avertissement strict.

## 5. Accès web

N/A pour le web externe : aucun accès externe exécuté. HTTP de test loopback uniquement.

## 6. Synthèse globale

STATS, filtres, purge propriétaire et versions 1.6.0 qualifiés sur sources.
La mise en service n’est pas exécutée. Archivage et rapport final restent à prouver.
