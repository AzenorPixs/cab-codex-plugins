# Validation SCM CAB3.0.3

## Mandat et périmètre
Mandat SCM/CI-CD3.0.3 validé, puis étendu explicitement : extensions Codex,
Agents côte à côte, retrait du chemin cab.json, étapes et détail RUN, cinq tables
projets/RUN/sessions/changes/tâches. Mode direct ; aucun orchestrateur fictif.
RUN SCM-cabu-auto-finalization-303 ; SID01a1c9e3-bed3-7a52-abca-0ea08eaa71d9.
Le relevé DEVOPS.md préexistant et les fichiers nouveaux non ignorés sont inclus.

## Vérifications exécutées le12novembre2026
-38tests Python ciblés et de régression sur PostgreSQL de fixture : réussis.
- Migration0005/0006 : identités, SID, générations, états et mandats des4RUN de
  fixture conservés ; relations normalisées. Django check sans anomalie et
  makemigrations --check --dry-run sans changement détecté.
- CLI Codex natif, profil isolé : plugins/skills/commandes3.0.3 installés,
  élément MCP tiers et modèle préservés ; cache de skill manquant réparé ;
  troisième application reconnue inchangée.
- Script postinst candidat exécuté en fixture avec vrai CLI : reçu vérifié,
  sans invocation de cab update. Répétition cab finalize : fichiers de profils
  contrôlés non réécrits et état dpkg inchangé. Client MCP réel détecté connecté
  par ses pipes privés et outils run_progress exposés.
- Compte enrôlé avec profil valide mais sans plan JSON : retrouvé et finalisé
  sans doublon ; ni scan global de HOME ni nouvelle autorisation de projet.
- Chromium156.0.8078.79 et Firefox153.7.0 : agents en colonnes, versions installées
  et cache GitHub, chemins non éditables, chemin cab.json absent des5pages,
  colonnes étape/tâches, route RUN,11étapes,6tâches dont3cochées et mobile réussis.
  Ancienne projection Electric conservée après ajout de colonnes : nouvelle étape
  visible. L’étape peut reculer ; aucune case ne valide le RUN.
- Syntaxe Python :25fichiers modifiés/nouveaux ; sh -n et ShellCheck postinst : réussis.
- TypeScript/Vite : réussis.27spécifications canoniques strictes réussies avant
  synchronisation et change courant valide en strict.

Le premier essai navigateur était indisponible après un arrêt de fixture pendant
recopie ; il a été relancé après stabilisation. Le binaire Codex copié pour test
portait un UID de build absent de la fixture : installation corrigée en root:root,
sans assouplir le détecteur du produit, puis versions vérifiées dans les navigateurs.
Le validateur générique quick_validate refuse le nom historique CABU en majuscules,
y compris son format antérieur ; ce nom distribué n’est pas renommé. Le frontmatter
YAML est inchangé et valide, les caches/skills ont été validés par le CLI natif.

## Préservation et repli
Sauvegarde logique, configuration et état privés avant migration sous
/var/backups/cab/pre-303-20261112 ; empreintes vérifiées. Maintenance temporaire
annulée après sauvegarde, sans arrêter les agents natifs. La migration de l’hôte
et la comparaison des sessions seront vérifiées après installation du DEB final.
Aucune restauration ou réémission d’effet inconnu n’est automatique.

## Cohérence documentaire
| Document | État et preuve |
| --- | --- |
| AGENTS.md / CODING_RULES.md | Inchangés ; règles applicables relues. |
| PROJECT.md / TECHNICAL.md | Version et finalisation/suivi3.0.3 documentés. |
| BUILD.md | Commande DIU3.0.3 et postinst/finalisation documentés. |
| DEVOPS.md | Relevé préexistant conservé et informations utiles relues. |
| DEVELOPMENT_MAP.md / BATCH_CODES.md | Entrée ciblée du change, code non attribué. |
| README.md | Installation automatique et nouveaux écrans présentés. |
| CHANGELOG.md | Entrée3.0.3 couvrant finalisation, extensions, UI et tables. |
| system-platform | Delta du change à synchroniser par archivage. |
| AGENT_INTEGRATIONS.md | Référence du socle absente ; aucune politique inventée. Le mandat explicite et le contrat CAB distribué gouvernent les intégrations autorisées. |

## Étapes suivantes
Archivage, rapport SGS, tentative DELTA, CI/CD DIU, qualification du paquet final,
activation et contrôles sur l’hôte. Ces états ne se déduisent pas des tests source.
