# Conception

La migration additive enrichit la table des clés et les fonctions de projection existantes. PostgreSQL conserve les informations d’authentification, les horodatages et la dernière mesure réussie. Les champs publics seuls passent par la projection des catalogues. La clé reste chiffrée au TPM.

Le service traite les demandes manuelles et les créneaux tirés au sort dans les fenêtres UTC de quatre heures. Une prise en charge atomique empêche le traitement concurrent et une réclamation expirée peut être reprise. La demande manuelle préserve le prochain créneau déjà prévu. Une modification de la destination invalide les anciens résultats. Les identifiants établis auprès d’un fournisseur sont utilisés pour les appels de catalogue du même fournisseur, via HTTPS sans redirection et avec les contrôles d’adresses existants.

La sonde OpenAI utilise la liste des modèles et, pour les mesures, le point d’accès aux limites de fine-tuning. L’aperçu indique les valeurs par modèle et les en-têtes de débit lorsqu’ils existent. Le solde reste indisponible pour la clé standard testée. OpenCode Go expose des pourcentages consommés sur cinq heures, une semaine et un mois. OpenRouter distingue les dépenses de la clé, le budget restant de la clé et le solde du compte lorsque le type de clé permet de le lire. Une URL générique peut servir de preuve d’accès au catalogue authentifié, les quotas y restent indisponibles sans contrat dédié.

La migration inverse rétablit les projections antérieures et retire les nouvelles colonnes. La réinstallation d’une version antérieure suit le mécanisme CAB habituel.
