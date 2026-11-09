## Context

Le registre CAB vérifie les changes archivés dans OpenSpec ; SGS observe les sessions directes et pilotées. Aucun des deux ne fournit, dans les interfaces examinées, une boîte générique livrant aux tours natifs Codex. Un avis est un signal de réexamen et ne remplace pas une validation locale.

## Decisions

Une interface locale versionnée sépare identité projet/session/RUN/mode, déclaration (type, identifiant et critère), avis (identité stable et référence de preuve) et accusé. Une boîte durable par destinataire est alimentée transactionnellement pour les déclarations correspondantes. Les écritures identiques sont idempotentes ; les collisions divergentes échouent. L'identité canonique du projet évite les collisions entre projets. Les clients authentifiés par les permissions locales limitent l'exposition et fournissent les identités exactes ; aucun secret n'est accepté dans les champs libres.

Les déclarations, publications, consultations et accusés sont des opérations distinctes. Le propriétaire de la session conserve la décision métier et réexamine les sources de vérité. Une pause n'est jamais levée par un avis. Une session SCM poursuit les dépendances nécessaires et soumet une extension de mandat à validation lorsque requise, sans pause pour dépendance. Pour les autres mandats concernés, l'arrêt ou la pause restent un choix explicite auprès du développeur, exécuté par les mécanismes existants et non par cette boîte.

Les interfaces doivent fonctionner sans OpenCode pour une session directe. La boîte et les références documentées constituent l'interface pour les prompts. Une notification native effective exige un adaptateur et une autorisation propres au canal ; sa disponibilité ne sera pas inférée de la persistance d'un avis.

## Risks / Trade-offs

La consultation de la boîte ne démontre pas l'arrivée d'un message dans un tour natif. L'accès local par un même utilisateur ne constitue pas une isolation cryptographique entre processus de cet utilisateur. Une preuve publiée peut devenir périmée ; seule la revalidation du destinataire permet sa réutilisation. Les données de coordination ont un cycle de vie indépendant des statistiques ; toute intégration à l'effacement terminal doit préserver les destinataires et publications encore nécessaires.

## Migration

Les RUN existants n'acquièrent aucune déclaration implicite. Le retour arrière désactive l'interface sans interpréter l'absence d'état comme une dépendance satisfaite. Les données conservées ne sont pas supprimées automatiquement. La coexistence et la reprise après panne doivent être prouvées avant toute migration ou nettoyage automatique.
