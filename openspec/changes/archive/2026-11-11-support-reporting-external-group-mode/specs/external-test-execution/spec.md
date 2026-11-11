## ADDED Requirements

### Requirement: État externe compatible avec le groupe

L'exécuteur externe MUST accepter les états détenus par son utilisateur en
0770 ou 2770, les reçus en 0770 et les anciens modes privés compatibles.
Il MUST créer les nouveaux fichiers de ce périmètre en 0770, conserver la
protection contre les liens et les autres comptes, et ne MUST NOT rejouer un
appel déjà exécuté. Un fichier d'hôtes connus en 0770 MUST être accepté si ses
autres contrôles d'identité et de contenu sont satisfaits.

#### Scenario: État normalisé sans rejeu
- **WHEN** l'état d'un appel externe est accessible en 0770 ou 2770
- **THEN** CAB peut lire son reçu et conserve la protection contre le rejeu
