# Refuser la variante native dans les entrées modèle

## Why

Une session relue expose model.variant mais les écritures du client attendent model.reasoning. Réinjecter directement le modèle relu ignore variant et peut produire silencieusement default. Le développeur autorise le correctif sous SCM avec incrément. Un seul change, code non attribué ; consultation ACL sans allocation ni lancement de son processus.

## What Changes

Jeu commun2.1.18. Refuser explicitement tout champ propre model.variant aux entrées createSession, createProbeSession, prompt et switchModel avant appel HTTP, avec code stable et message français indiquant model.reasoning. Documenter la conversion explicite d’un modèle relu. Conserver reasoning valide, l’omission intentionnelle du niveau et le format natif de lecture ; aucun alias implicite ni relance automatique.

## Impact

Client V2, tests isolés du contrat d’entrée, documentation modèle du skill/commande et cadrages concernés, versions communes et OpenSpec transport/distribution. Aucune nouvelle route OpenAPI, suppression de session, règle PLLM ou changement de modèle actif. Services, RUN et sessions réels préservés. Cycle SCM avec archive/statistiques et publications conditionnelles ; activation distincte du mandat source.

Contrôle documentaire nécessaire : adapter les assertions de distribution aux formulations normatives du protocole0.6 actualisé concurremment, en vérifiant les mêmes garanties de mandat séparé, périmètre du rapport et absence de réarchivage. Le protocole et le template ne sont pas édités.
