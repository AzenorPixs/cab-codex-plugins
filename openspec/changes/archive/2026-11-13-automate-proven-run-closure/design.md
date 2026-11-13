# Cadrage validé

Une évaluation retourne action (close, historical, normalize, archive, blocked,
service), motifs et empreinte. Les confirmations relisent les preuves sous
verrou du RUN. Le worker réévalue périodiquement après les observations locales
et au démarrage, sans tour LLM. La fermeture normale réutilise le parcours
CAB de statistiques et de clôture ; aucun test ni effet externe n'est rejoué.
Les périodes ouvertes restent protégées jusqu'à leur fin légitime.

Les imports déjà CLOSED peuvent retrouver étape11 si le snapshot chiffré,
son hash, l'identité et son enregistrement de clôture concordent. La suspension
IMPORT_PROTECTED est conservée et affichée séparément du véritable état.
Le format SQLite est lu en mode immutable depuis une copie privée temporaire ;
aucun état original ni secret n'est exporté. Format inconnu, origine absente ou
effet indécis : refus documenté. Une session service sans tâches reste une
session de service, jamais un change terminé par déduction.

SessionArchive garde un reçu et une référence unique vers le RUN existant,
plus un instantané d'identité ; aucune migration destructive des relations.
Le booléen archived et la protection sont exposés dans la projection Electric.
L'API d'archives reste limitée au projet autorisé. Archivage manuel seulement
après CLOSED prouvé, aucune acceptation construite ni fermeture de pair.
