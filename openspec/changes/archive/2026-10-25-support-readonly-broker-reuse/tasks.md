## 1. Contrats et périmètre
- [x] 1.1 Créer et valider le delta ciblé avant code/tests.
- [x] 1.2 Figer les empreintes des archives L1/L2 et des gardes/broker conservés.

## 2. Implémentation
- [x] 2.1 Ajouter la preuve en lecture seule des artefacts et processus broker.
- [x] 2.2 Exclure le broker externe des écritures et distinguer fichiers/processus.
- [x] 2.3 Persister l'intention de déconnexion, le gel sur échec et la reprise sûre.
- [x] 2.4 Documenter interface, procédure, limites et distribution 1.9.0.

## 3. Qualification
- [x] 3.1 Couvrir preuves invalides et absence de mutation des sources.
- [x] 3.2 Qualifier transition, interruptions, reprise et absence de faux rollback.
- [x] 3.3 Prouver la séparation réelle de deux UID dans le banc isolé.
- [x] 3.4 Exécuter syntaxe, régressions, OpenSpec et cohérence documentaire.
- [x] 3.5 Vérifier périmètre, UTF-8/LF et empreintes conservées.

Les cases ne couvrent aucune activation réelle, décision R0, réparation du
prévol coordonné, modification Pixs, droit/compte hôte ou opération Git.
