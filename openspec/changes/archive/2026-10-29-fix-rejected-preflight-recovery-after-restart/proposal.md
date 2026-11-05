# Réconciliation explicite d'un prévol rejeté après redémarrage

## Pourquoi

Le recovery CISMP7 Pixs conserve une erreur MCP -32602 suivie d'une resoumission du même identifiant et d'un rejet natif. Le retry ordinaire refuse cet historique ; après redémarrage, la décision locale est également absente. Un gel global protège le registre et ne peut être levé tant que ce recovery reste sans preuve réconciliée.

## Changement

Ajouter une réconciliation humaine bornée, distincte de retry, qui scelle le rejet natif et l'absence d'effet sans reconstruire une décision exécutable. Permettre la levée explicite du seul gel global lié à ce reçu après recontrôle de toute la cohorte. Exiger ensuite un nouveau prévol complet avec décision et permission once propres.

## Portée

Contrôleur, contexte de job, tests de recovery et coordination, documentation, distribution commune 2.1.7. Aucun changement fonctionnel Pixs. Déploiement par CABU seulement après validation et archivage du présent change. Les preuves et décisions antérieures restent conservées.
