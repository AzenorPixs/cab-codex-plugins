# Qualification du contrat autonome — 13 novembre 2026

## Preuves réellement observées
- 6 tests purs de contrat : couverture, natures, argv, doublons et revue réservée.
- 9 tests PostgreSQL : capture, source périmée, UNKNOWN, adoption/immutabilité,
  producteur authentifié et portée, doublon/conflit, révocation, artefacts,
  activation corrélée, dossier piloté et reprise après interruption statistique.
- 16 non-régressions des parcours historiques et 7 statistiques réussies.
- Parcours public réel dans cab-300-package-test : exécution native CAB réussie,
  puis archive ; le worker ferme le RUN et sa période, sans submit/review/end/close.
  Identités et opérations conservées. Sans preuve : FINALIZATION_PENDING ;
  le codeur non habilité ne peut pas attester.
- Chromium156/Firefox153 : attentes explicites, politique CLOSED et provenance
  réelle visibles ; captures inspectées. TypeScript/Vite et compilation Python.
- Migration additive0013 appliquée sur fixture ; makemigrations --check sans delta.
- Journaux non versionnés : output/scm/cab-3.0.0/finalization-322-*.

## Cohérence documentaire
| Document | Conclusion |
| --- | --- |
| AGENTS.md / CODING_RULES.md | Inchangés, preuves et protections conservées. |
| PROJECT.md / TECHNICAL.md | Version actualisée ; Django porte l'autorité et PG le durable. |
| BUILD.md | Version actualisée ; outil de livraison externe existant, pas de dépendance métier ajoutée. |
| DEVOPS.md | Inchangé ; runtimes, PostgreSQL dédié, OpenSpec et navigateurs prescrits. |
| DEVELOPMENT_MAP.md | Entrée ciblée sans attribution de code ; ACL ultérieur. |
| openspec/BATCH_CODES.md | Aucune allocation ni consolidation globale. |
| README.md / CHANGELOG.md | Contrat et limites décrits ; contenu Unreleased préexistant conservé. |
| docs/run-finalization.md | Règles, provenance, producteurs, reprise et API commune documentés. |
| Skills/commandes CAB | Versions et cadrage initial actualisés ; pas de moteur embarqué parallèle. |
| OpenSpec system-platform | Contrat, preuves, finalisation et natures spécifiés. |
| AGENT_INTEGRATIONS.md | Référence préexistante absente ; pas de configuration tierce modifiée à la main. |

Les anciens RUN/imports ne sont pas adoptés implicitement. Les tests de fixtures
historiques sont explicitement sans contrat pour représenter cet invariant.
Un outil natif hors exécuteur CAB exige un producteur habilité, aucune inférence
sur journal de tokens. L'API de preuves n'intègre aucun outil CI/CD particulier.

Le RUN SCM de ce mécanisme, commencé avant son installation, pourra adopter son
contrat explicitement avant sa première opération pour qualifier la clôture
sur l'hôte ; les faits CABU proviendront du job système réel. La livraison et
l'activation ne sont pas anticipées dans cette revue source.
