# Contrat validé

FinalizationPlan OneToOne RUN, EvidenceProducer autorisé par administrateur,
RunEvidence immutable à identité producteur/clé stable. Les preuves contiennent
nature, critère/check, résultat, révision, empreinte artefact et référence bornée.
Le texte libre et les tokens natifs ne sont jamais des reçus d'exécution.
Les permissions de producteur sont distinctes de l'identité du codeur.

Le contrat déclare des checks (id, argv exact, critères couverts), des exigences
externes (id, kind, critères, producteur autorisé), la nature et la revue réservée.
Les checks sont rapprochés des opérations CAB réellement terminées, sans nouvelle
exécution. La révision avant/après est vérifiée et le déplacement vers archive
peut être normalisé à contenu/modes constants. Une preuve différente pour la
même identité est refusée ; aucune preuve extérieure ne modifie une Operation.

Nature développement : archive complète requise. Livraison/activation : exigences
de publication/installation/disponibilité adaptées, sans tests fictifs. Services :
preuve explicite de fin. Une planification vide ou des critères non couverts
restent une attente. Initialisation au run.begin ou adoption explicite unique,
uniquement avant toute opération/revue/gel ; aucun amendement implicite de mandat.
Les anciens RUN restent sur le parcours existant.

Le service assemble un dossier sans soumission du LLM et vérifie sous verrou.
En piloté la revue finale reste réservée à l'orchestrateur ; en direct les critères
mécaniques sont validés par politique initiale. Les périodes du seul RUN sont
fermées quand la frontière de fin contractuelle est prouvée, avec snapshot réel
à la finalisation, jamais rétrodaté. Les stats restent propriété du service.
Un état FINALIZATION_PENDING explicite les attentes sans lever protections.
Reprise mécanique après crash ; reçu unique ; aucune opération UNKNOWN rejouée.
