# MCP pending pendant CABU — CAB 2.1.28

## Attente et reçu

Le chemin ordinaire observe pending avec le budget --wait-ms existant (défaut120000ms, maximum900000ms), sans nouvelle variable ni plafond relevé. Chaque requête HTTP reste bornée ; une requête d’observation en cours peut terminer après la borne de boucle. Une commande connect/disconnect est précédée d’une intention durable ; elle n’est jamais renvoyée à la suite d’un timeout. Les GET seuls attendent la transition. Un auth requis ou failed reste une erreur explicite, pas une preuve de pending réparable.

Un pending initial persistant avant coupure conserve le staging, les services intacts et MCP_RECOVERY_REQUIRED. Après coupure, les services CAB existants sont remis disponibles sans boucle de reconnexion native ou de rollback. Le même reçu conserve phase d’origine, failureCode et intention de transition. Aucun nouveau reçu d’installation n’est ouvert tant que cet état n’est pas réconcilié. Un état pending ne vaut ni autorisation ni exécution métier.

Une reprise ordinaire peut observer un retour autonome : si l’installation est complète et les versions/readiness fraîches sont vérifiées, elle termine le MÊME reçu. Une préparation intacte reprend son staging. Une coupure avant installation ou un ancienROLLBACK_FAILED se réconcilie par repli, puis retourne rolled-back sans ouvrir automatiquement l’installation suivante. --rollback reste une demande de repli, jamais convertie en succès d’installation.

## Autorisation du rechargement global

La demande générale CABU et une ancienne autorisation consommée ne donnent aucun droit de rechargement global. L’opérateur doit obtenir une autorisation explicite pour le reçu exact, coordonner les locations concernées et expliquer que POST /api/location/reload reconstruit TOUTES les locations et annule permissions/formulaires en attente. Les processus et sessions persistantes restent à préserver ; aucun kill, restart OpenCode, dispose ou effacement de journal n’est admis.

Après cet accord seulement, reprendre les mêmes chemins/URLs/paquet et ajouter à l’updater installé :

```text
--recover-mcp update-<identifiant-exact-du-reçu-nonterminal>
```

Le flag lie le consentement au reçu MCP_RECOVERY_REQUIRED ou ancienROLLBACK_FAILED exact. Reçu absent, étranger, terminal ou profil frozen-recovery-controller/reuse-readonly : refus sans rechargement. Aucune option globale n’est implicite dans /CAB update ordinaire. --recover-mcp n’autorise aucune décision, permission ou reprise métier.

## Contrôles et intention unique

Le client mcpRecoverySnapshot observe le PID/version et la location MCP canonique, une empreinte des IDs globaux des sessions (pagination bornée), le nombre de sessions actives globales et de permissions du raccord partagé. Il ne retourne ni corps, secret, modèle ou message libre. Les autres locations ne sont pas sondées ni initialisées ; leur coordination et leurs formulaires restent dans le périmètre de l’autorisation explicite. La frontière doit être inactive et sans permission partagée. Cette observation ne prouve pas l’absence d’effet métier.

Le reçu écrit l’intention de rechargement AVANT l’unique POSTglobal. Un crash après intention peut avoir précédé l’envoi : son résultat reste inconnu et le POST n’est quand même pas rejoué. Après réponse perdue ou délai expiré, seules des observations peuvent réconcilier le résultat. Une intention déjà présente ne permet jamais un second rechargement, même avec le même flag. Si le raccord ne revient pas, conserver le même reçu ouvert et diagnostiquer ; ne pas purger le verrou ni bricoler le journal.

Après reconstruction, comparer PID/version/location et empreinte des sessions, vérifier l’inactivité et l’absence de permission partagée, puis artefacts/versions et readiness fraîche. Une identité changée ou une mauvaise version refuse la clôture sans restauration artificielle. Le PID initial est lié aux nouvelles transactions ; pour un ancien reçu sans cette preuve, la capture avant le rechargement établit seulement la continuité de cette action, sans fabriquer une mesure historique.

Une installation complète récupérée retourne completed avec le même transactionId. Un repli retourne rolled-back avec ce même identifiant ; une nouvelle installation ultérieure est distincte et ne doit pas être présentée comme la réussite du repli. Aucun résultat n’est déduit d’un simple HTTP200 ou du retour de systemctl. Les erreurs antérieures restent historiques dans les reçus et preuves.

## Retour aux sessions

Après activation vérifiée des quatre briques, informer les sessions avec les versions réelles et le reçu terminal. Chaque propriétaire effectue lookup de ses demandes/approvals, réconciliation des effets et leases, puis prévol requis avant les seuls travaux déjà mandatés. Ne pas annuler un PENDING CAB, restaurer un ancien état, rejouer once, changer de fournisseur/modèle ou relancer le codeur pour réparer le raccord. Les commandes de profil ne sont publiées qu’après succès réel des briques.
