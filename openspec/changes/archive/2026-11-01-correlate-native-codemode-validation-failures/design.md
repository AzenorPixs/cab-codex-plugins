# Design

Le contrôleur conserve la vérification native exacte de session et des champs
d'identité. Il élargit seulement le prédicat de statut accepté pour
`cgpt-validation_request_validation` : en plus de `running` et `completed`, la
partie peut être `error` si le normaliseur CAB a produit
`metadata.cabCodeMode.nativeMcpError === true`. Ce marqueur est reconstruit à
partir d'un unique appel CodeMode littéral et de métadonnées natives
concordantes ; il n'est pas repris des métadonnées du transcript.

La validation continue d'exécuter les gardes de RUN, session, révisions,
manifestes, permissions et unicité avant admission. L'acceptation envoie
uniquement la notification attendue au broker ; elle ne modifie pas la
décision, l'état `NOT_ADMITTED`, la permission ou le once. Toute partie brute,
appel multiple, marqueur absent/fabriqué ou identité divergente demeure refusée.
