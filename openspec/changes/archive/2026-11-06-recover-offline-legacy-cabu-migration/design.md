# Contrat de récupération agnostique

Les critères sont la présence d’un état legacy, le schéma accepté par le
lecteur cible, les empreintes du reçu, l’état des services et l’identité native.
Ni identifiant de projet/machine ni numéro de reçu n’est une constante métier.
La validation du lecteur cible utilise un répertoire privé isolé et ne démarre
ni serveur, ni agent, ni outil métier. Les originaux sont conservés octet pour
octet ; un inventaire avant/après couvre tous les fichiers copiés.
Une reprise de reçu ROLLBACK_FAILED revalide ses artefacts stage/backup/installés
et conserve sa cible ; une avancée vers une version plus récente intervient
seulement après clôture vérifiée de ce reçu. Schéma inconnu, permissions
pendantes, lecteur absent, source modifiée ou propriétaire divergent : refus.
Les états métier incertains sont copiés avec leurs protections, pas neutralisés.
Le repli sélectionne uniquement les services initialement actifs et confirme
l’inactivité des autres. Une erreur de repli doit être exposée sans secret.
