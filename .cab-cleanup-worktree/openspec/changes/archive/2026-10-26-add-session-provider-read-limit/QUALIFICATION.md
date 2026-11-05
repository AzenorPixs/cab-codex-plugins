# Qualification SCM — providerMaxBytes, CAB 1.10.2

Demande humaine directe : correctif via SCM, limite définie par la session de pilotage, incrément de toutes les briques, tests et installation locale sans fermer OpenCode. Aucun Git inspecté ou publié. Le paramètre optionnel providerMaxBytes est propre à la résolution et à modelSelection lors de l'armement ; entier sûr positif en octets, sans plafond fixe ajouté. Omission compatible à 2 Mio, observations de sessions/messages et catalogue PLLM inchangés.

## Validations observées

- Node : 399 déclarés, 373 réussis, 0 échec final, 26 ignorés (25 bancs nécessitant le paquet historique 1.7.1 et un banc OpenCode natif optionnel non activé).
- Python : 73 réussis. Syntaxe : 32 fichiers vérifiés ; trois copies broker identiques aux sources.
- Test HTTP réel du contrôleur : catalogue fournisseur synthétique >2 Mio, budget exact accepté, un octet de moins refusé, budget >16 Mio accepté, nouvel appel sans paramètre toujours borné à 2 Mio. Valeurs invalides refusées avant observation ; armement et persistance sans corps privé ; sessions/messages gardent 2 Mio.
- Banc Docker à deux UID réels depuis paquet original 1.10.1 : succès et réponse de déconnexion perdue, broker créé depuis un thread secondaire. Chaque scénario conserve OpenCode, PAUSE et sources broker, vérifie l'interdiction noyau d'écriture et atteint quatre versions 1.10.2. Registre HTTP 5 218 616 octets, privé 5 657 060 octets, 40 RUN et 256 ressources par RUN. Aucun compte ou droit hôte modifié.
- Les premiers essais ont détecté des références de version à aligner et un compteur de test sensible au SSE ; les attentes ont été corrigées au contrat sans désactiver de vérification. Les résultats ci-dessus sont ceux des exécutions finales réussies.

## Cohérence documentaire

| Document | État |
|---|---|
| AGENTS.md | Inchangé : sécurité et règles SCM conservées. |
| PROJECT.md | Version 1.10.2 et responsabilité du budget explicitée. |
| TECHNICAL.md | Contrat providerMaxBytes, validation et portée documentés. |
| BUILD.md | Incrément commun et qualification depuis 1.10.1. |
| DEVOPS.md | Inchangé : runtimes et Docker autorisé employés, aucune dépendance nouvelle. |
| README.md | API et limites locales documentées. |
| CHANGELOG.md | Entrée 1.10.2 ajoutée, historique conservé. |
| ORCHESTRATED_CODING.md, commande /cab et skill | Version courante et passage explicite du budget par le pilotage. |
| OpenSpec | Trois exigences ajoutées et mentions courantes de version synchronisées dans les deltas, validation stricte avant archive. |

PREUVES-SCM.json référence 68 fichiers contrôlés par empreinte. Journaux dans output/scm/add-session-provider-read-limit. Aucune réponse /provider réelle n'est sauvegardée ou exposée, seuls des jeux synthétiques sont employés dans les tests. Les archives historiques sont préservées. Pas de test LXC physique, de nouvelle génération fournisseur ou de modification du catalogue/provider PA02.

L'installation réelle est distincte de la qualification. Elle doit conserver le processus OpenCode courant, vérifier les quatre versions chargées, les jobs et pauses, puis libérer le gel. PA02 reste en pause humaine sans reprise automatique. Le budget utilisé pour le contrôle local est choisi explicitement par cette session de pilotage, sans configuration globale CAB.

Instruction humaine ultérieure : terminer uniquement l'archivage ; l'application des mises à jour locales revient à la session qui les demande. Aucun déploiement, gel ou redémarrage de service n'est réalisé dans ce change. Les sources et preuves de préparation restent distinctes des versions chargées.
