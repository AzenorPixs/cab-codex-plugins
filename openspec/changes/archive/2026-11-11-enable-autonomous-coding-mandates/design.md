# Conception

Le nouveau profil est une délégation explicite, pas une approbation automatique
de toutes les demandes historiques. Le registre conserve le mandat dans le RUN.
Les chemins sont bornés à la réservation et protégés des pairs ; les commandes
utilisent le lanceur isolé existant, avec sous-arbres autorisés RW et réseau isolé.
Les reçus d’exécution restent idempotents et indépendants des décisions du LLM.
La revue finale fige une empreinte des sources et les preuves des essais.
Une demande de corrections rouvre la réalisation ; une acceptation reste liée
à la même empreinte, recontrôlée lors de la publication. Les décisions initiales
sont déclarées résolues et documentées avant activation. Une session historique
ne reçoit jamais une délégation implicite pendant une mise à jour.

Les opérations externes ne deviennent pas libres par une permission shell globale.
Les bancs autorisés doivent être couverts par un adaptateur vérifié ; aucun repli
hôte libre n’est admis lorsque l’isolation est indisponible. La collecte passive
n’est pas un échange décisionnel ; les mesures distinguent les deux.
