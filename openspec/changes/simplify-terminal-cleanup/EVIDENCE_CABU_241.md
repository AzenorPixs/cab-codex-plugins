# Échec de préparation CABU 2.4.41

Le 8 novembre 2026, le reçu `update-ff325803-e558-47d2-be51-4e1bce90d677`
s’est arrêté en `PREPARATION_FAILED` avec `update-unit-invalid`, avant bascule.
Les cinq services CAB étaient actifs après cet arrêt. Les unités livrées dans
le paquet 2.4.41 portaient encore la description 2.4.40 ; l’updater exige la
version du paquet. Les unités ont été réalignées en 2.4.42 et le contrôle de
leurs descriptions et commandes de démarrage a été exécuté localement.
