## Principes

Le mode 0770 est la cible de création des fichiers utilisés par CAB. Une
permission existante différente ne suffit pas à elle seule à refuser une
opération lorsque les accès effectifs et les invariants du protocole restent
assurés. Les vérifications de propriétaire, type, identité, liens, intégrité
et exclusivité sont conservées et adaptées explicitement à chaque usage.
Les outils ou services tiers peuvent imposer des conditions complémentaires ;
leur refus est rapporté sans prétendre à une réussite.

Le reporting et le runner externe sont traités en priorité. Les composants de
continuité, de stockage, de maintenance, de reporting, de secrets et de
communication sont inventoriés et qualifiés par domaine. Les tests couvrent
0770, les anciens modes compatibles, les accès impossibles et les cas où la
sécurité ou l'intégrité du protocole exigent un refus.

## Inventaire et compatibilité

L'inventaire couvre le broker et son journal, les exécutions externes et
ateliers, les états de RUN et de continuité, la coordination et ses verrous,
les reçus de permissions, les canaux inter-UID, SGS/CCAB et leurs outboxes,
les moniteurs, credentials, mises à jour et chemins de récupération. Les
copies historiques et les modes enregistrés dans des reçus antérieurs sont
conservés pour permettre leur lecture ou leur retour arrière. Les exécutables
et autres ressources système restent soumis aux droits effectifs du système.

Un nouveau canal inter-UID choisit le groupe du workspace si le contrôleur en
dispose ; sinon il conserve son groupe courant et signale tout accès POSIX
impossible. Le noyau reste l'autorité d'identité du pair. CABU enregistre
séparément le mode de l'artefact remplacé pour le restaurer lors d'un repli.
