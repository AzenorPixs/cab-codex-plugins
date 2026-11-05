# Expliquer les refus HTTP des décisions CAB

## Why

POST /decision/<id> peut retourner400 sans corps. La garde d’admission réduit ses erreurs à false et le gestionnaire masque ensuite toute exception. Une demande peut rester indécise avec GETdecision404, sans motif visible. Le développeur demande ce correctif sous SCM avec incrément, puis CABU et information des sessions.

## What Changes

Jeu commun2.1.16. Rendre les causes d’admission accessibles au seul chemin de diagnostic de décision, en conservant le chemin booléen existant pour les autres usages. HTTP400 JSON contient error, message français fixe et decision_recorded. Liste fermée de codes ; erreurs inattendues filtrées. Distinguer décision invalide, inconnue, déjà enregistrée, restriction de rejet, contexte, opération invalidée et révisions/admission refusées. Garder les contrôles avant/après attente native, les409 existants et le201 de succès.

## Impact

Contrôleur et job-context, tests isolés/directs et HTTP réel, OpenSpec transport/distribution, documentation et versions communes. Aucun changement de règle de décision, de décision persistée, de once, accès, modèle, format métier ou seuil de transport. Exemples génériques. Cycle SCM complet, publication conditionnelle puis activation CABU prouvée avant notification. Aucun template ni protocole ORCHESTRATED_CODING.md modifié.
