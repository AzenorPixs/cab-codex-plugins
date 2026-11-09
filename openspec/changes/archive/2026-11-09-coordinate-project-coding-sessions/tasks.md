## 1. Contrat et coordination

- [x] 1.1 Spécifier les identités, dépendances, avis, preuves, confidentialité et garanties de concurrence. Preuve : `openspec validate coordinate-project-coding-sessions --strict`, réussie le 9 novembre 2026 ; la conformité de l'implémentation reste distincte.
- [x] 1.2 Fournir une interface durable et testée de déclaration, publication, consultation et acquittement pour les sessions directes et pilotées. Preuves source du 9 novembre 2026 : tests de `test_session_dependencies.py` et scénario contrôleur réel avec transports natifs factices ; aucune activation réelle déduite.
- [x] 1.3 Qualifier un moyen d'avertir effectivement les sessions actives et conserver les avis des sessions en pause sans reprise automatique. Preuves source du 9 novembre 2026 : serveur Codex réel isolé, découverte, envoi et observation ; contrôleur réel avec transports factices et tests de pause. Aucune activation utilisateur déduite.
- [x] 1.4 Préserver la poursuite SCM des dépendances et exposer, pour les autres mandats concernés, le choix explicite pause ou arrêt ciblé ; qualifier le raccordement aux protections et à la clôture existantes. Preuves source du 9 novembre 2026 : choix enregistrés sans action implicite, refus de pause SCM, tests des gates et de clôture ciblée ; l'adaptation des prompts relève de leur propre session.

## 2. Intégration et validation

- Bilan de blocage résolu le 9 novembre 2026 : clarification de récupération archivée, 19 scénarios ciblés et 444 tests contrôleur réussis ; rapport statistique individuel produit. Le couple SGS global reste incompatible et préservé.

- [x] 2.1 Documenter les interfaces versionnées destinées aux prompts et la distribution, ainsi que les limites de transport et de confidentialité. Preuve : référence `session-dependencies.md` et 11 tests de distribution et d'autorité réussis le 9 novembre 2026 ; la livraison reste distincte.
- [x] 2.2 Vérifier les tests ciblés, la concurrence, les pannes, les doublons, les permissions, les sessions paires et les tests globaux applicables. Preuves du 9 novembre 2026 : 70 tests Python, 15 tests de clôture et gates, 115 tests de distribution et 444 tests contrôleur réussis ; les échecs antérieurs et corrections sont conservés dans le bilan.
- [x] 2.3 Vérifier la cohérence documentaire et OpenSpec et l'éligibilité à l'archivage. Preuves : revue documentaire, validation stricte globale et clarification du contrat de récupération ; l'archivage et son rapport restent à exécuter.

## Sous-lots normalisés

Code non attribué : les repères suivants restent provisoires en attente d'ACL ; aucun identifiant SL définitif n'est alloué.

- **Contrat** — tâche 1.1 ; critères : scénarios et sources d'autorité cohérents, validation OpenSpec. État : VALIDÉ le 9 novembre 2026 par la validation stricte du change ; ne valide pas l'implémentation.
- **Boîte et fiabilité** — tâches 1.2 et 2.2 ; dépend de 1.1 ; critères : tests isolés de persistance, isolation et reprise. État : VALIDÉ au niveau source le 9 novembre 2026 ; tests de persistance et validation globale 2.2 réussis.
- **Transport et cycle de vie** — tâches 1.3 et 1.4 ; dépend de 1.1 et des interfaces natives disponibles ; critères : transport qualifié, pause conservée et choix explicite. État : VALIDÉ au niveau source ; intégration des prompts séparée.
- **Distribution et finalisation** — tâches 2.1 et 2.3 ; dépend des unités applicables ; critères : documentation, validations et preuves de clôture. État : VALIDÉ au niveau source le 9 novembre 2026 ; documentation, validations et rapport individuel vérifiés ; livraison et activation distinctes.
