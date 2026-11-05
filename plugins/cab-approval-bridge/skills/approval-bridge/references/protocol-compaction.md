# Compaction et continuité — CAB 2.2.37

## Compactage coordonné selon le contexte

Déclencher le compactage à une frontière sûre entre mandats lorsque la pression
native du contexte, une limite exposée ou une demande explicite le justifie.
Aucune échéance de quatre-vingt-dix minutes n'est imposée. L'absence de mesure
ne permet pas d'inventer un taux ; conserver checkpoint, décisions, ressources,
preuves et premier jalon non prouvé avant toute compaction.

Vérifier les API réellement disponibles dans les deux sessions actives.
OpenCode V2 utilise POST /api/session/<id>/compact, avec id natif stable pour
un retry exact ; une réponse d'admission ne prouve pas sa fin. Observer les
événements session.compaction.ended ou failed de la session concernée. Pour
l'orchestrateur, employer uniquement l'API de sa connexion propriétaire
lorsqu'elle est exposée et sa preuve native de fin ; ne jamais compacter une
session auxiliaire à sa place. Une réussite conjointe exige les deux preuves.

Une API absente ou un échec avec contexte préservé laisse le cycle incomplet,
sans classer le RUN BLOQUÉ, arrêter CAB, différer les statistiques ou demander
une dérogation. Ne pas attendre une API absente ; réexaminer sa disponibilité
lors d'un changement de capacité ou du prochain besoin réel. Un effet inconnu,
un compactage en cours ou une perte de contexte suspend seulement les actions
concernées jusqu'à réconciliation. Aucun rejeu de mandat, changement de modèle
ou redémarrage d'agent n'en découle. Tracer les sessions et résultats connus,
sans identifiant inventé.

Contrats natifs vérifiés le 2 novembre 2026 :
[API OpenCode V2](https://dev.opencode.ai/v2/docs/api) et
[compactage](https://dev.opencode.ai/v2/docs/compaction/).
