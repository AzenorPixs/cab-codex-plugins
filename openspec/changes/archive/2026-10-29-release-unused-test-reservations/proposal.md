# Restituer une réservation de test sans effet

## Pourquoi
Une réservation HELD reste bloquante lorsque seuls des diagnostics sans mutation ont été exécutés et que SSH est inaccessible. La restitution ordinaire exige à juste titre nettoyage et vérification ; aucune annulation HELD explicite n’existe.

## Périmètre validé
Le développeur valide le correctif sous SCM avec incrément commun 2.1.13, après présentation du mécanisme release-unused. Ajouter une restitution explicite, attestée par l’orchestrateur et autorisée spécifiquement par le développeur, avec relecture native complète, frontière exacte, reçu durable et tests isolés. Préserver les parcours existants. Archiver et publier conditionnellement selon SCM. Aucun RUN réel, SSH, service actif, template ou copie ORCHESTRATED_CODING.md n’est modifié ; aucune activation CABU dans ce cycle.

## Impacts
Route POST distincte ; reçu optionnel dans le registre 4. Les états historiques restent lisibles. Un ancien lecteur strict refuse le reçu enrichi : revenir en arrière exige une réconciliation explicitement autorisée, jamais la restauration d’un état supprimant des preuves récentes.
