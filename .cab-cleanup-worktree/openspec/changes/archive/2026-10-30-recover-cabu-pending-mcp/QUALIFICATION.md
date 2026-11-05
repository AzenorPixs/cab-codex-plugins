# Qualification SCM — CAB2.1.28

30octobre2026. Change unique, code non attribué ; attribution ACL ultérieure.

## Correction

L’ancien updater vérifiait connected immédiatement après le POST natif, puis un échec pouvait engager le repli sur le même raccord bloqué. Le nouveau parcours attend pending dans le budget existant, journalise chaque intention native avant émission et ne répète pas connect/disconnect après résultat inconnu. MCP_RECOVERY_REQUIRED conserve le même reçu et sa phase d’origine ; les services existants restent accessibles sans boucle native.

Une reprise peut constater le retour autonome et terminer la même installation sur artefacts/versions/readiness vérifiés. Un staging intact reprend son reçu ; un repli nécessaire ou ancienROLLBACK_FAILED se clôt séparément, sans installation suivante implicite. --rollback est conservé comme repli.

Le flag --recover-mcp <transactionId> est un consentement explicite pour un seul rechargement global de ce reçu, excluant profils gelés/reuse-readonly, reçus absents/étrangers/terminaux, activité ou permissions partagées. Intention durable avant POSTglobal ; crash ou réponse inconnue n’autorise aucun second POST. PID/version/location, empreinte des IDs globaux des sessions et frontière native sont vérifiés. Les autres locations/formulaires nécessitent coordination et accord humain ; aucune absence globale d’effet métier n’est déduite.

## Preuves exécutées

Node global676cas :645réussis/31ignorés/zéroéchec ;136concurrence en36,900448s,509autresréussis sur540cas en64,142031s. Python81/81 en5,848s. Native privée exacteOpenCode2.2.0 :4/4 en21,932837s. Total exécuté réussi730 ; ciblés inclus, pas additionnés. Syntaxes70JS/16Python, trois copies broker identiques, UTF-8/LF et empreintes protégées. OpenSpec standard/strict17/17 avant archive.

Cas isolés : pendingtransitoire/persistant/initial avantcoupure, timeout connect, intention connect interrompue, aucune réémission, services disponibles, retour autonome, consentement/profile/activité/permission, réponse reload perdue, crash après intention, mauvaiseversion/PID/sessions, anciensROLLBACK_FAILED, reçu absent/terminal et refus needs_auth/failed sans reload global. Les gardes historiques et tests de récupération restent réussis. Observation client : pagination globale bornée, compteurs partagés exacts, sortie filtrée et sans lecture d’un contexte étranger.

Banc natif : serveur MCP de fixture volontairement retardé (initialisation20s), pending réellement observé ; un POST /api/location/reload reconstruit le raccord, connecté ensuite, mêmePID et session persistante, permissions/activité nulles avant/après. Ce scénario qualifie le pending et le rechargement V2 ; il ne prétend pas reproduire la cause interne exacte du blocage de production27. L’updater récupéré est qualifié séparément par les fixtures d’état et de services ; le CABU de production et sa readiness restent à observer après publication. Aucun nouveau fournisseur réel sollicité, aucun processus OpenCode de production arrêté ; seuls les processus privés de test sont nettoyés.

AGENTS,DEVOPS,ORCHESTRATED_CODING et concurrent-runs inchangés par SHA256 ; aucun template, credential, modèle ou configuration native modifié. Les mandats, demandes et once métier restent sous leurs propriétaires. Nouvelle version distribuée via SCM, activation puis information exigent leurs reçus distincts. Preuves locales : output/mcp-pending28/.
