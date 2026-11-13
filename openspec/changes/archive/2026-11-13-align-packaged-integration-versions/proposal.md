# Mise à jour autonome CAB par MCP et cohérence du paquet

Code non attribué. Correctif3.2.1, OpenSpec/tests/CI/CD/CABU explicitement
autorisés le13novembre2026 après échec de finalisation du paquet3.2.0.

## Why
Le moteur3.2.0 et les manifestes de plugins3.1.4 divergent. payload_digest
refuse correctement la finalisation, mais la préparation aurait dû bloquer.

## What Changes
- Aligner moteur, frontend, manifestes, commandes et références distribuées3.2.1.
- Précontrôler les versions et fichiers requis avant toute écriture de payload.
- Conserver le refus de finalisation existant ; qualifier le paquet puis activer
  par CABU, sans modification manuelle des fichiers installés.

## Impact
packaging/prepare.py, métadonnées de version et tests. Aucun nouveau privilège,
nouvelle dépendance, migration métier, modification de project.env directe ou
mise à jour sans sudo. L'ancien RUN reste distinct et son reçu refusé conservé.

## Extension explicitement autorisée

Le développeur demande dans ce même correctif que CABU invoque le MCP et que
CAB gère lui-même sa mise à jour, sans LLM, puis retourne OK et la nouvelle
version. L’autorisation est agnostique aux comptes : tout client CAB actif et
authentifié peut réclamer cette seule opération officielle, sans liste UID.
L’identité du demandeur est auditée ; aucun shell, chemin local ni URL client.
