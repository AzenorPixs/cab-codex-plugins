# Décision

Parcourir les preuves natives de la tentative courante dans l'ordre, après vérification du préfixe historique. Un request_validation enregistré et refusé localement peut terminer directement par REJECTED, ou échouer par timeout puis être suivi de get_approval/poll_approval pour son approval_id exact. Chaque réponse doit reprendre requestId, approval_id, session_id, directory, change_id, files et commands. Un statut PENDING corrélé reste non terminal ; seul REJECTED établit le refus. Toutes les demandes enregistrées doivent être refusées avant la frontière suivante.

Le contrôleur conserve le chemin MCP -32602 antérieur à tout enregistrement. Un autre échec, une preuve absente/divergente, une décision approved, une consommation, un outil natif supplémentaire, un historique altéré ou une décision locale perdue refuse retry. Les outils de polling sont des lectures de l'approbation existante, jamais une demande de remplacement.

# Compatibilité et risques

Aucun endpoint, paramètre de configuration, schéma persistant ou protocole MCP nouveau. La corrélation par tentative et l'ordre natif empêchent qu'un polling étranger ou antérieur satisfasse le refus. Le superviseur demeure gelé jusqu'à complete. L'interdiction de désarmer pendant retry ne retire pas l'autorité d'un arrêt explicite du développeur ; cet arrêt reste distinct, avec gate et réconciliation, sans purge ni arrêt des services communs.

# Validation

Tests HTTP isolés : polling get/poll après timeout, PENDING puis REJECTED, rejet direct existant, identités et opération divergentes, polling sans demande, timeout sans refus, erreur générique, décision locale absente/approuvée, effets natifs, frontières et reprise complète. Contrôles de distribution/version/protocoles, suites Python/Node applicables, syntaxe et OpenSpec strict avant/après archivage.

# Bilan documentaire final

| Document | État et preuve limitée au correctif |
| --- | --- |
| AGENTS.md | Inchangé, identique au relevé initial ; §7 distingue SCM direct et sessions pilotées, exige le rapport par archive. |
| PROJECT.md | Mis à jour, §7 Résilience : refus par polling et arrêt humain distinct ; neutralité CAB conservée. |
| TECHNICAL.md | Mis à jour, §3 version source 1.0.2 et §Retry après prévol divergent : corrélation, timeout seul, refus terminal et limites. |
| BUILD.md | Mis à jour, §6 qualification du polling isolé, §7 et distribution : version courante 1.0.2 et absence de migration des RUN actifs. |
| DEVOPS.md | Inchangé, identique au relevé initial ; inventaire PHYSICAL du 2026-10-14 avec chemins Node/Python/OpenSpec effectivement utilisés. Aucun service installé. |
| README.md | Mis à jour, récupération et distribution : règle du polling, arrêt distinct et version source 1.0.2. |
| CHANGELOG.md | Mis à jour, Unreleased : correctif 1.0.2, limites et absence de déploiement. Aucune date de publication inventée. |
| openspec/specs/ | Deux capacités synchronisées par l'archive, validation stricte 8/8 ; autres capacités inchangées. Anciennes exigences de distribution 1.0.0/1.0.1 décrivent désormais leurs garanties conservées dans la version courante. |
| ORCHESTRATED_CODING.md | Huit projets/templates mis à jour : section de retry identique, clauses spécifiques conservées, quatre anciens renvois corrigés. |
| Skill source et commande /cab | Mis à jour avec le même bloc de récupération et l'autorité d'arrêt explicite ; caches installés non modifiés. |

# Qualification et limites

- Défaut reproduit avant correction par deux échecs HTTP 409 au lieu de 200.
- Premier passage de la suite récupération après code : deux nouvelles attentes de test étaient trop strictes sur le texte reason du gate OPEN ; rectifiées pour vérifier l'état OPEN réel sans changer le contrôleur.
- Final : 49 tests ciblés réussis ; Node global séquentiel 127 réussis, un test OpenCode natif optionnel non exécuté ; Python 48 réussis.
- Le passage Node global parallèle a observé un échec temporel existant de supervision (session-active au lieu de session-not-idle). Les mêmes tests passent séquentiellement. Le superviseur et son test ne sont pas corrigés dans ce périmètre ; seule la version du superviseur change.
- Python a émis un ResourceWarning de nettoyage d'une erreur HTTP 409 synthétique ; suite réussie, aucune correction hors périmètre.
- L'archive a émis un avertissement non bloquant de titres de proposition. Les titres structurels Why/What Changes ont été corrigés dans la proposition archivée, sans réarchivage ; validation canonique stricte 8/8 ensuite.
- Aucun accès aux API CAB/OpenCode actives, installation, reconnexion, redémarrage, arrêt, purge, Git ou mutation de la récupération CISMP2. Les essais HTTP utilisent des services simulés sur ports éphémères.
- La mise en service et la reprise de CISMP2 restent distinctes ; les décisions locales ne sont pas reconstruites implicitement après redémarrage.
