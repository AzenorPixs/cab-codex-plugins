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
