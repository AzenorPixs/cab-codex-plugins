# Démarrage — CAB 2.2.1

## `/CAB start`

Dès la résolution du workspace absolu canonique, appliquer intégralement
`monitor-service.md` du skill CAB installé, avant PLLM, santé
OpenCode et prévols modèle/MCP. Ce passage est obligatoire à chaque entrée
ou reprise de session de codage pilotée, même si le contrôleur et le superviseur
sont déjà actifs et réutilisés. Ne pas se limiter au constat d'une unité absente :
si elle est inactive ou absente dans le périmètre autorisé, installer son jeu
indépendant, puis exécuter `systemctl --user daemon-reload` et
`systemctl --user start cgpt-approval-bridge-monitor.service` séparément.
Réutiliser une instance active conforme sans modification ni redémarrage.
Vérifier service actif, GET /api/identity avec la version de base du plugin CAB installé et identity.workspace
attendus, puis GET / ; ne pas lire /api/snapshot pour ce contrôle d'identité ;
terminer cette tentative bornée et rapporter son résultat avant les contrôles amont.
Afficher l'URL réelle uniquement après ces preuves,
sinon la cause et l'URL attendue séparément du statut CAB. Préserver configuration
et port existants, sans activation au login. Un échec PLLM ou CAB ultérieur
n'arrête pas le moniteur. Une divergence active ou un échec de monitoring ne
permet aucun arrêt, redémarrage ou changement de RUN dans les autres briques.

Après ce contrôle du monitoring et avant les étapes ci-dessous, appliquer intégralement
`session-reset.md` depuis le skill `approval-bridge` du plugin
CAB installé. Toute réinitialisation globale exclusive impose la purge complète du runtime CAB,
y compris journal, approbations, anciens jobs, checkpoints et conflits
Syncthing, sans lire ou restaurer l'ancien contenu. La commande autorise cette
purge des seuls espaces CAB, après preuve d'inactivité, arrêt des ressources
et déconnexion native du broker ; elle ne ferme pas OpenCode. Le plugin
distribue `scripts/cgpt-approval-bridge-reset.py` pour l'exécution contrôlée.
Une purge échouée ou incomplète impose `CAB_INACTIF`, sans premier mandat.
La reprise ordinaire du même RUN conserve ses preuves et ne relance pas cette
purge, y compris après prévol de récupération divergent : conserver la
candidate et le job selon la procédure ci-dessous.

1. Vérifie qu’OpenCode répond sur `127.0.0.1:4096`.
2. Vérifie que la configuration OpenCode V2 déclare `cgpt-validation` comme serveur MCP local `stdio` sous `mcp.servers`.
3. Consulte l’état MCP par `GET /api/mcp` authentifié et vérifie `location` ainsi que l’enveloppe `data`. Cette API est la seule source de vérité pour les sessions persistantes ; une sortie de CLI ou un état mémorisé ne suffit pas.
4. Si `cgpt-validation` n’est pas `connected`, tente uniquement les routes V2 documentées de reconnexion du MCP ciblé, puis relis `GET /api/mcp`. N’appelle pas `/instance/dispose` et ne tue, démarre ni redémarre directement le broker. En cas d’échec, publie `CAB_INACTIF` avec l’erreur observée et n’ouvre aucune session de codage.
5. Identifie dans la configuration API OpenCode l’agent de codage qui recevra le premier prompt et relève son fournisseur, son modèle et son niveau de raisonnement effectivement configurés. Ne modifie jamais cette configuration et ne lis aucune donnée secrète.
6. Vérifie via l’API OpenCode que le fournisseur et le modèle relevés sont publiés et disponibles. Crée alors une session de prévol temporaire, sans outil ni accès au projet, et lui adresse une requête inoffensive en imposant exactement ce fournisseur, ce modèle et ce niveau de raisonnement.
7. Contrôle la réponse et ses métadonnées réellement observées. Elles doivent confirmer le même fournisseur, le même modèle et le même niveau de raisonnement. Ferme la session de prévol après cette preuve. Si une valeur est absente, indisponible, divergente ou si la requête échoue, publie `CAB_INACTIF` avec les valeurs attendues et observées, puis n’installe pas le contrôleur et ne crée ni ne réutilise de session persistante.
8. Résous les ressources du plugin CAB installé, puis copie son contrôleur, son superviseur et leurs modèles d’unité dans les répertoires stables du profil : `~/.local/share/cab-approval-bridge/` et `~/.config/systemd/user/`. Pour la sélection automatique, applique la préparation du catalogue décrite ci-dessous. Fusionne son patch validé `OC_Codex_PLLM_CATALOG` dans `~/.config/cab-approval-bridge/controller.env`, avec le workspace absolu du job et `OC_Codex_OUTSIDE_SANDBOX=1`, en préservant les autres options et sans y écrire de secret. Exécute `systemctl --user daemon-reload`. Cette installation différée ne doit jamais appeler `systemctl --user enable` et ne doit pas démarrer le service avant cette commande `/CAB start` explicite.
9. Démarre ou réutilise le contrôleur Codex persistant hors sandbox par `systemctl --user start cgpt-approval-bridge-controller.service`, avec `OC_Codex_OUTSIDE_SANDBOX=1` ; l’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1` reste accepté. Vérifie qu’il est `active` et que son unité utilise `Restart=on-failure`.
10. Vérifie le contrôleur Codex sur son interface locale.
11. Démarre explicitement le superviseur utilisateur par `systemctl --user start cgpt-approval-bridge-supervisor.service`, puis vérifie son statut local. Il utilise `Restart=on-failure`, sans activation au login, et ne prend aucune décision CAB.
12. Établit et maintient le flux SSE HTTP direct OpenCode authentifié `GET /api/event`.
13. Crée une nouvelle et unique session de codage OpenCode persistante pour ce nouveau RUN avec l’API V2 `POST /api/session`. Réutilise la session uniquement pour une reprise du même RUN. Conserve et affiche son identifiant ; elle est l’unique canal des mandats de codage jusqu’à la clôture du job.
14. Adresse les mandats exclusivement à cette session via `POST /api/session/<id>/prompt`. Aucun appel CLI éphémère ne peut transmettre ou exécuter un mandat de codage. La session doit rester visible au développeur dans OpenCode.
15. Dans cette session, appelle `broker_readiness` sans lecture, commande ni écriture du projet.
16. Accepte comme états possibles : `READY`, `DEGRADED`, `BLOCKED`, `HUMAN_REQUIRED`.
17. Après reconnexion SSE ou divergence détectée, réconcilie l’état réel via HTTP auprès d’OpenCode, puis recontrôle `/api/mcp` avant tout nouveau mandat.
18. Vérifie la supervision native et le suivi événementiel du RUN. Ne crée pas
   d'automation LLM périodique pour contrôler un état inchangé.
19. La supervision native surveille OpenCode, `/api/mcp`, `broker_readiness`, le contrôleur, le superviseur et le SSE OpenCode.
20. Le suivi reste silencieux lorsque tout est sain et ne prend aucune décision de validation.
21. Publie `CAB_ACTIF` uniquement si les preuves suivantes sont présentes :
    - OpenCode sain ;
    - MCP `cgpt-validation` connecté ;
    - `broker_readiness` exploitable ;
    - contrôleur Codex joignable ;
    - superviseur CAB joignable ;
    - SSE OpenCode `connected` ;
    - supervision native active.
22. Toute preuve absente impose `CAB_INACTIF`.
23. Avant le premier pilotage réel après démarrage, exécute obligatoirement `/CAB test`.

Une simple réponse HTTP, un ancien état MCP ou une ancienne session de test ne suffit jamais à déclarer `CAB_ACTIF`.
