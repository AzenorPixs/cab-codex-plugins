# Tasks

## 1. Contrat durable du contrôleur

- [x] 1.1 Ajouter le magasin atomique et les endpoints locaux d'armement, progression, lecture et désarmement d'un job, puis vérifier leurs refus et leur persistance avec les tests Node.
- [x] 1.2 Persister le gate terminal d'un job armé et l'exposer dans le statut sans secret, puis vérifier qu'un désarmement prématuré retourne un refus.

## 2. Superviseur persistant

- [x] 2.1 Ajouter le superviseur Node.js, son état atomique et son endpoint local de statut, puis vérifier la restauration d'un job au redémarrage avec les tests Node.
- [x] 2.2 Ajouter la réconciliation SSE/HTTP, le délai par défaut de 60 secondes et la reprise idempotente vers la session enregistrée, puis vérifier l'absence de relance lorsque le gate ou les contrôles techniques l'interdisent.

## 3. Distribution et commande

- [x] 3.1 Distribuer l'unité systemd utilisateur du superviseur et adapter `/cab start`, `/cab run` et `/cab stop`, puis vérifier l'absence d'activation au login et l'ordre du cycle de vie.
- [x] 3.2 Porter le broker, le contrôleur, le superviseur, le manifeste et la commande à `0.85.0`, puis vérifier leur cohérence par les tests de distribution.

## 4. Validation

- [x] 4.1 Exécuter les tests Node et Python applicables ainsi que `node --check` et `python3 -m py_compile`, puis corriger tout échec lié au change.
- [x] 4.2 Valider strictement l'évolution OpenSpec et vérifier que toutes les tâches cochées possèdent une preuve observée.
