## Aperçu et confirmation

L’aperçu distingue l’éligibilité ordinaire de l’éligibilité sans preuve de
clôture. Le Web transmet la confirmation explicite avec l’empreinte d’aperçu
et les confirmations existantes. Le serveur recalcule l’aperçu sous verrou
et enregistre dans le reçu si la preuve de clôture a été écartée.

## Nettoyage PostgreSQL

Supprimer les passages d’étape des feuilles vers leurs parents pour respecter
leurs clés étrangères, puis les cycles. Les mesures de tokens propres suivent
leurs relations de suppression. Les agrégats des étapes concernées sont recalculés
à partir des passages restants. Si un passage ou une mesure d’un autre RUN
référence les données à supprimer, le RUN est protégé.

Le SID reste utilisé tant qu’un RUN ou une période de mesure le référence.
Les preuves de livraison et la source d’import restent utilisables. La source
d’import empêche notamment le réimport d’un RUN déjà supprimé. Les fichiers
de projet restent intacts. Aucune migration ni purge globale n’est nécessaire.
