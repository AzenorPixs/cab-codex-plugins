# STA02 — Statistiques natives et réduction des attentes CAB

## Why

Les audits MULTIRUN des 13–14 octobre montrent une faible activité métier
simultanée et des exclusions d'intégration de 8 à 26 minutes. La collecte et
la rédaction par un RUN d'observation supplémentaire ajoutent du travail et
la clôture documentaire retient la barrière commune. Les attentes de cohorte,
de réconciliation et de ressources globales sont distinctes du transport.

## What Changes

- Alimenter automatiquement des statistiques persistantes, sans contenu de
  messages, commandes, sorties ni secrets, depuis le contrôleur et son SSE.
- Exposer JSON et brouillon Markdown déterministe à six sections, par contexte
  de change, sans RUN d'audit ni appel LLM supplémentaire. Préparer ce brouillon
  en continu ; l'orchestrateur conserve sa validation et le mandat de publication.
- Permettre une phase documentaire après publication, limitée au fichier de
  statistiques de l'archive et sans détention prolongée du verrou d'intégration.
- Ajouter une file FIFO persistante d'intégration et la stabilisation des pairs,
  avec réconciliation de référence avant reprise et sans libération par timeout.
- Permettre la réduction explicite des ressources à une frontière quiescente,
  sans élargissement ni effacement de l'obligation de publication.
- Préparer les opérations complètes, garder une décision par mandat et traiter
  immédiatement les événements, avec latences médiane/p95 et causes distinctes.

## Impact

Change unique autorisé par le développeur le 15 octobre 2026 : collecte intégrée
et six mesures validées. Sources du contrôleur, job-context et registre ; nouveau
module statistiques ; tests Node et de distribution ; OpenSpec et documentation
du protocole embarqué. Pas de dépendance ajoutée, de Git, de déploiement, de
modification de Pixs, de service actif ni de relecture d'historiques exclus.

Les interfaces historiques restent disponibles ; les nouvelles fonctions sont
additives. Les métriques absentes sont N/A, busy n'est pas du codage productif,
les quotas restent partagés et aucun gain causal n'est inventé. La réservation
reste détenue jusqu'au rapport validé et au gate TERMINÉ. Le retour arrière se
fait sur les sources avant installation ; un état nouveau ne doit pas être
chargé par une ancienne installation sans réconciliation coordonnée.
