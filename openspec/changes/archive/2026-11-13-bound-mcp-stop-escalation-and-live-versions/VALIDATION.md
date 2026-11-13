# Validation — arrêt borné et versions MCP

## Preuves observées
- 6 tests politique/arrêt, enfants de recette exclusivement : EOF naturel,
  enfant ignorant TERM effectivement sorti par SIGKILL, KILL désactivé,
  requête active, mode/identité divergents et frontière perdue après attente.
  Le mode MCP est doublé uniquement pour ces enfants contrôlés ; PID/UID/PPID,
  pidfd, signaux et code de sortie sont réels. Aucun client utilisateur visé.
- 5 tests de non-régression du relais et 4 du registre conservés.
- 3 tests PostgreSQL projection minimale, isolation du flux et audit idempotent.
- Deux profils MCP stdio réels en conteneur : opération unique achevée avant
  remplacement, moteur/catalogue observés, audit persisté, mêmes SID/RUN/génération
  et receipt_digest. En-tête de version simulé dans ce seul conteneur.
- Chromium/Firefox, / et /agents : mutations et déconnexions Electric sans reload
  du document (marqueur de page conservé), boule verte, texte vert gras à gauche
  d'API et cartes Agents. Mises à jour observées en moins d'une seconde en recette.
- Migration0015 additive et publication Electric minimale, makemigrations --check
  sans delta. Compilation Python et TypeScript/Vite réussies, OpenSpec strict.
- Journaux ignorés : output/scm/cab-3.0.0/mcp-324-*.

## Cohérence documentaire
| Document | Conclusion |
| --- | --- |
| AGENTS.md / CODING_RULES.md | Inchangés ; preuves et protections appliquées. |
| PROJECT.md / TECHNICAL.md | Version actualisée ; architecture Django/PG/Electric conservée. |
| BUILD.md | Version actualisée ; packaging et activation existants. |
| DEVOPS.md | Inchangé ; outils système et navigateurs prescrits. |
| DEVELOPMENT_MAP.md | Entrée ciblée ; code non attribué, ACL ultérieur. |
| openspec/BATCH_CODES.md | Aucune allocation ni consolidation globale. |
| README.md / CHANGELOG.md | Arrêt borné et affichages live documentés. |
| docs/mcp-stop-policy.md | Politique /etc, quiescence, audit, versions et limite des anciens relais. |
| OpenSpec system-platform | Comportements et paramètres spécifiés. |
| AGENT_INTEGRATIONS.md | Référence préexistante absente ; aucune configuration tierce modifiée manuellement. |

Un ancien relais déjà chargé ne reçoit pas le nouveau code par supposition :
relay_version inconnu reste inconnu. Le helper sécurisé est utilisé par les
relais3.2.4 ; les moteurs MCP et leurs catalogues sont des versions distinctes.
La livraison et l'activation hôte ne sont pas anticipées dans cette revue source.
