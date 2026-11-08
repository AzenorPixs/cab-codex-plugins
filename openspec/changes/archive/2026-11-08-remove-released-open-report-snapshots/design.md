# Conception

La sélection utilise une identité de session et un rapport publics examinés,
une preuve de libération et un prévol de la génération SGS. Toute session
encore liée ou ambiguë bloque son retrait. Le service modifie ses propres
données atomiquement et remet une preuve de purge. La source Pixs reste intacte.

L’import filtre les seules identités libérées attestées, y compris lors d’une
révision du rapport ; les autres sessions et les nouveaux relevés restent
admissibles. Une suppression globale par chemin ne convient pas : elle masquerait
les futurs RUN. Les agrégats impossibles à ventiler ne sont pas inventés ni
attribués à un pair. Aucun accès direct à la base privée ne fait partie de
l’interface. La portée et les règles exactes de preuve restent à qualifier avant
implémentation et activation.
