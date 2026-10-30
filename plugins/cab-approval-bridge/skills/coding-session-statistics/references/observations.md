# Statistiques et observations CAB 2.1.17

Les consultations sont ponctuelles, en français et en lecture seule. Elles ne démarrent aucun job, ne réveillent aucun RUN et ne produisent aucune permission. Les anciennes vues `/statistics` et `/runs/<runId>/statistics` restent disponibles, dont le brouillon individuel à six sections.

| Commande | Sélection GET /statistics/view |
|---|---|
| `/CAB stats` | `selection=current` |
| `/CAB statslast` | `selection=last` |
| `/CAB stats 24` | `selection=24h` |
| `/CAB stats7` | `selection=7d` |
| `/CAB stats30` | `selection=30d` |

Un `runId` explicite filtre son identité ; sans cible, la vue courante présente chaque contexte actif. `contextId` sélectionne un contexte historique. `format=markdown` restitue la vue lisible. La dernière livraison exige un passage DELIVERED observé ; publication, REPORT et simple consultation ne la prouvent pas.

Les segments natifs commencent à l'activation de cette collecte ; les compteurs cumulés antérieurs ne deviennent pas des événements de fenêtre. Les fenêtres sont découpées à leurs bornes. Une lacune, une portée absente ou une éviction de rétention reste INCONNU. Les détails natifs sont bornés à 30 jours et 200000 éléments par famille.

Sources natives et importées apparaissent séparément, avec identité, bornes, couverture, dénominateurs et limites. Les paires en concurrence triple et les conditions d'attente se recouvrent ; ne pas les additionner. Busy et issuedEffectMs ne prouvent pas du codage productif. Les métriques de coordination portent leur borne de disponibilité ; une ancienne source sans ces champs reste inconnue sur ce point.

L'import local explicite utilise `POST /statistics/import` avec le seul champ `bundle`, du projet exact. L'identité source/dataset et l'empreinte assurent une importation durable et idempotente. Un contenu divergent ou un champ inconnu est refusé sans modification des décisions, réservations, permissions ou gates. Les snapshots sont privés, bornés, atomiques et refusent les liens ; une erreur reste visible sans reconstruire de données.

L'outil `cgpt-approval-bridge-import-observations.mjs` reçoit les chemins explicites `--samples`, `--config`, `--monitor`, `--quota` et `--proof`, puis produit `--output`. `--samples` est répétable pour des journaux successifs ordonnés, jusqu'à 32 fichiers. Il ne suit aucun chemin contenu dans les documents, n'ouvre pas d'historique brut OpenCode et ne redémarre pas le job arrêté. Il vérifie la déclaration d'arrêt, la stabilité des fichiers pendant la lecture et les limites d'entrée/sortie. Le JSONL est traité en flux, sans charger l'audit complet en mémoire ; un fichier de sortie existant n'est pas écrasé.

Les corps, commandes, chemins d'opérations, URL, sorties, secrets et identifiants bruts de compte ne sont jamais conservés dans le jeu filtré. Les preuves sont des identités opaques, empreintes et contrôles de format. Les quotas restent partagés : une différence n'est calculée que pour des bornes du même compte, même fenêtre et même reset ; sinon N/A motivé.

La publication d'un rapport d'archive conserve un mandat distinct et sa vérification. L'import ou la consultation ne remplace ni le rapport, ni une approbation, ni le gate terminal. SCM conserve ses propres preuves et rapports sans activer la compétence de statistiques pilotées.
