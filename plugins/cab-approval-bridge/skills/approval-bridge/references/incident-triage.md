# Qualifier un incident et capitaliser le diagnostic — CAB 2.2.28

Pour choisir sans relecture globale : [grille de décision](pilot-state-matrix.md) ;
pour une unité ordinaire : [soumission, décision et acquisition](validation-submission.md).

## Avant de solliciter une correction

Identifier la surface observée, le composant et sa version réellement chargée,
le workspace, RUN/contexte, SID, requestId/operationId et call natif concernés.
Relever les dates du call et du démarrage du contrôleur, le code de refus
exact déjà observé, l’état du registre, de la décision, de l’accès, de la
permission et de once. Les identités et empreintes peuvent être transmises ;
les tokens, credentials et payloads bruts sensibles restent locaux et privés.

Consulter seulement les références du cas et les lectures nécessaires. Ne
pas inventer un mandat, rejouer une opération consommée ou réarmer un RUN
pour obtenir un diagnostic. Les contrôles et sondes prévus au mandat courant
restent possibles dans leur cadre. Un manque de preuve reste indéterminé, jamais un faux positif
par défaut. Une garde justifiée reste en place, même si elle retarde un effet.

| Constat | Interprétation et parcours supporté |
|---|---|
| Notification503 puis MATCHED après timeout/poll | Distinguer instant du snapshot et forme du wrapper ; le binding const avec await search est qualifié depuis17, l’assertion de chemin fixe depuis18, voir [native](technical-native.md). Garder les mêmes identifiants et relire la corrélation. |
| Shell APPROVED refusé, aucun accès, retrait direct non qualifié | [shell approuvé sans accès](approved-shell-retirement.md) ; vérifier manifeste/révisions/disjonction avant toute acquisition de coordination. Un recouvrement ne se contourne pas. |
| Ancien PENDING, décision désormais APPROVED, accès HELD | Relire admission et décision sur les mêmes identifiants ; si l’unité devient obsolète avant émission, suivre [retrait APPROVED/HELD](approved-held-retirement.md) sans solliciter le correcteur pour la clôture ordinaire. |
| HTTP401 sur un GET direct | Tester les GET info/session avec le client CAB authentifié localement, sans exposer le credential ;voir [interfaces](protocol-interfaces.md). Un401 sans auth ne prouve pas un SID défaillant. |
| broker_readiness absent du catalogue Codex | Le broker MCP appartient à OpenCode. Vérifier search/execute dans la session OpenCode ciblée lors d’une reprise mandatée ;voir [interfaces](protocol-interfaces.md) et [native](technical-native.md). Son absence réelle côté OpenCode reste à diagnostiquer. |
| evidence=null pour une ancienne demande | Comparer dates du call, démarrage du contrôleur, contexte et rétention. Un get_approval historique n’est pas une notification neuve. L’absence ne prouve ni effet ni cause initiale ;voir [admission](admission-state.md). Un NOT_ADMITTED demeure terminal. |
| RUN marqué BLOCKED, ressource de test restaurée | Le résumé agrégé n’identifie pas à lui seul la garde d’une opération disjointe. Relire ses ressources, accès et retour exact ;suivre l’acquisition CAB normale du mandat autorisé. Aucun bail incertain n’est libéré pour contourner le résumé ;voir [concurrence](concurrent-runs.md). |
| Plugin installé ou contrôleur actif | Distinguer source, paquet, quatre processus, readiness broker et adoption. Un service accessible ne prouve pas que le transport complet fonctionne ;voir [mise à jour](component-update.md). |
| once acquittée et outil terminé exit1 | L’exécution CAB peut être prouvée tandis que le test métier échoue. Conserver son exit et ses protections ;ne pas l’appeler panne de transport ou réussite métier. Une capacité d’environnement absente ne qualifie pas une exigence non testée. |

## Conclusion et autonomie

Classer explicitement :défaut reproduit, procédure déjà couverte, observation
historique non attribuable, preuve insuffisante ou protection légitime. Citer
la référence et la séquence applicables ;préciser ce qui manque au lieu de
faire essayer plusieurs formats. Employer les récupérations déjà autorisées
dans le change ;le développeur intervient pour une extension hors périmètre.
Les travaux indépendants autorisés continuent selon leurs propres gardes.
Un signalement ne donne aucune autorité opérationnelle au chat correcteur sur
le RUN métier. Respecter la [coordination des incidents](coding-incidents.md).

## Après un faux positif établi

Si l’ambiguïté est généralisable et mal couverte, amender la référence canonique
minimale et ses liens de skill/commande/cadrage. Sinon, transmettre le passage
existant sans duplication. Les gardes fonctionnelles et l’historique ne sont
pas modifiés pour faire disparaître un signalement. Un vrai défaut garde sa
spécification et sa régression propres.

Appliquer le mandat SCM, l’incrément, la publication et CABU autorisés ;rapporter
séparément documentation source, paquet installé et activation observée. Le
nouveau cadrage ne prouve aucun ancien diagnostic ni aucune reprise métier.

Shell ou edit refusé avant once attaché à un parent HELD : [retrait ciblé](approved-attached-shell-retirement.md). Conserver le parent et ses autres effets.

NOT_ADMITTED natif et préparation sans décision : [retrait qualifié](not-admitted-retirement.md). Une absence temporaire de readiness donne503, pas une incompatibilité de contrat.

Appairage navigateur ou accès restauré : suivre [la reprise propriétaire autonome](owner-reconciliation.md),
sans sollicitation humaine pour une procédure déjà mandatée.

ASK nominal sans permission réelle, grant sauvegardé ou terminal de lecture
sans once avec parent seulement référencé : suivre [le contrat ciblé](native-permission-grants.md).
