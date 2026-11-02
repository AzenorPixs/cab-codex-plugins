# Suivi événementiel et efficacité — CAB 2.2.0

## Cadences de pilotage

Traiter le SSE OpenCode en temps réel. Réveiller le suivi sur demande, décision,
rapport, fin native ou changement de readiness. Une attente HTTP de décision
est bornée à une seconde et réveillée après persistance de la décision ; le
nombre d'attentes est borné. En perte de flux, utiliser le curseur durable,
puis un repli technique borné avec temporisation progressive. Aucun tour LLM
périodique, contrôle toutes les 3 secondes ou pause fixe de 7 secondes n'est
requis. Les temporisations techniques du superviseur, heartbeats et rappels
restent distinctes ; une attente n'expire pas le mandat métier.

Consigner résultats et causes dans le checkpoint non secret. Toute reprise
exige la réconciliation des effets, de la santé OpenCode, de MCP, de la readiness
CAB et des permissions. Une reprise ne vaut jamais approbation et ne rejoue
aucun mandat consommé. La politique PLLM conserve sa fraîcheur au démarrage
initial et son attente humaine sans benchmark ni réessai automatique.

La collecte statistique native continue remplace les tours LLM de collecte.
Conserver sondes initiale et finale ; une relève de trente minutes utile à un
rapport peut être produite par le collecteur sans réveiller l'orchestrateur.
Une mesure absente reste N/A motivé et une relève manquée n'est jamais recréée
rétroactivement. Un défaut de télémétrie seul ne suspend pas le RUN.

## Échanges et mesures

Séparer le préfixe stable du contrat des identités variables. Un mandat
référence le checkpoint vérifié (id et SHA256), puis décrit objectif,
autorisations, ressources, critères et seuls changements utiles. Le rapport
suivant fournit résultats nouveaux, preuves et prochaine action ; une lacune
ou divergence du checkpoint exige sa relecture, jamais un historique supposé.
Le helper differentialMandate conserve explicitement permissions, périmètre et
critères. Référencer les longues preuves plutôt que les recopier.

GET /runs/<run_id>/efficiency expose les dimensions natives par message,
fournisseur et modèle, leur couverture et leur indisponibilité. Les doublons
sont remplacés par identité, les snapshots cumulatifs session.usage.updated ne
sont pas additionnés aux messages. Zéro reste zéro ; absence reste inconnue.
Le total natif n'est pas reconstruit en additionnant des dimensions dont le
recouvrement n'est pas prouvé. Le coût est celui exposé par OpenCode en USD.
Une réduction documentaire en octets n'est pas un gain de tokens facturés ;
sans référence fournisseur comparable, les économies restent N/A.

Poursuivre sans arrêter le travail pour attendre un créneau. Une sonde
statistique échouée reste distincte d'un échec du benchmark PLLM et ne suspend
pas, à elle seule, le RUN.
