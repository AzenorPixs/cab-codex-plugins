# Édition native et attente de mandat — CAB 2.1.10

## Why

Un search MCP vide a été interprété comme absence de l’outil edit, sans preuve des outils natifs présentés au modèle. Le banc 2.1.9 qualifie shell et write, pas une édition partielle. Après recovery complete, le superviseur peut envoyer REPRISE_CAB_SUPERVISEUR sans mandat courant et inciter à des commandes non mandatées.

## What Changes

Qualifier sur OpenCode 2.2 isolé le catalogue natif réellement envoyé au fournisseur, le mécanisme d’édition partielle, ask/once et les refus sans effet. Ajuster seulement les normalisations et consignes nécessaires. Pour les RUN pilotés sans mandat courant, publier une attente pour l’orchestrateur au lieu de générer un prompt au codeur. Aligner les artefacts source sur 2.1.10, synchroniser, archiver, produire STATISTICS.md puis appliquer les publications conditionnelles SCM.

## Périmètre validé

Le développeur a validé explicitement le 29 octobre 2026 le périmètre CAB 2.1.10 proposé dans ce chat. Un seul change, tests isolés, documentation, versions communes, archivage et publications conditionnelles SCM. Aucun changement des briques actives, du RUN Pixs, du raccord OpenCode, des secrets ou du template. CABU exige une coordination distincte. Les anomalies supplémentaires restent des constats avant validation d’une extension.

## Extension explicitement validée

Le développeur a validé dans ce même chat l’extension aux écarts V2 reçus : récupération sûre d’une erreur MCP avant enregistrement, isolation des permissions étrangères par session, télémétrie native tokens/coût/SSE. Adaptations minimales client/contrôleur/recovery/statistiques, deltas, tests positifs/négatifs isolés et documentation. Aucun RUN, preuve ou service actif modifié. Les erreurs de proposition d’agent ne sont pas assimilées à des bugs CAB.

## Priorité de raisonnement demandée

Le développeur demande explicitement de documenter dans le protocole CAB (skill/plugin/commande) la convergence des nouvelles sessions et reprises vers medium quand disponible, puis high sinon. La sélection par défaut et ses spécifications sont alignées pour éviter une consigne non réalisable ; les niveaux explicitement imposés restent prioritaires. Aucune session active n’est modifiée et aucune nouvelle évaluation PLLM n’est déclenchée.
