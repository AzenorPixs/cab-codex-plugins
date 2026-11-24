# Borner les remédiations et notifications MCP

## Why

Sur l’hôte CAB 3.33.0, les rechargements natifs répétés de la même instance Codex ont renouvelé les relais et généré plus de mille alertes d’échec. Les pertes qui se chevauchaient étaient traitées séparément et les retours transitoires du catalogue rouvraient la remédiation.

## What Changes

- Regrouper les pertes contemporaines de la même instance et du même emplacement. Conserver les reçus et les protections des actions déjà engagées.
- Attendre une topologie stable avant un contrôle automatique des doublons et borner ce contrôle à un par incident.
- Confirmer le retour à une liaison unique uniquement après une observation stable du relais, du moteur et du catalogue.
