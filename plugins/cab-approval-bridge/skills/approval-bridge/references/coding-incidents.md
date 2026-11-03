# Incidents pendant le codage CAB — 2.2.13

Commencer par le [triage des observations](incident-triage.md) avant de conclure à une panne.

## Diagnostic et récupération dans le mandat

Consigner le symptôme daté, RUN/job/session/demande, version source et version
active observée, code filtré, ressources affectées et preuve disponible.
Séparer cause démontrée, hypothèse et information manquante. Ne transmettre
ni secret, environnement complet, transcript privé ou source métier inutile.

Lire l'aperçu GET /runs/<run_id>/recovery et la référence recovery-policy.md.
Choisir une récupération qualifiée déjà autorisée, sous sa politique et le
même reçu ; vérifier son résultat. Une coupure seule n'est ni refus métier,
ni NO_EFFECT, ni motif de rejeu. Réconcilier un résultat incertain avant effet.
Une tentative sans nouvelle preuve ne justifie pas des réinitialisations en
boucle. Conserver les protections concernées et poursuivre les tâches disjointes
lorsque leur mandat et leurs preuves restent valides.

Pour catalogue natif/MCP, erreur fournisseur, conducteur incomplet ou registre
indisponible, consulter native-coding-recovery.md. Pour réponse perdue et
bascule, consulter transport-continuity.md. Une récupération réussie peut
résoudre l'incident sans nouveau correctif, publication ou attente de chat.
Une décision réservée ou une extension d'autorité réellement nécessaire reste
présentée au développeur avec le point précis et les alternatives autorisées.

## Coordination lorsqu'elle est demandée

Un problème CAB ne crée pas automatiquement un chat de correction et ne
transmet aucun message à une autre session. Lorsqu'une telle coordination
est explicitement demandée, rechercher la cible désignée, y compris les
résultats archivés accessibles, vérifier son contexte et éviter tout doublon.
Une création de chat exige la demande explicite correspondante. Une clôture
ou révocation prévaut sur un ancien routage ; « Correctif CAB - OC » n'est plus
une destination automatique pour les nouveaux incidents après sa livraison
finale. Si le chat courant est la cible, consigner directement sans auto-message.
Une ambiguïté ou un outil indisponible reste signalé sans envoi prétendu.

## Correction et activation distinctes

Lorsqu'un correctif est requis dans son propre mandat, distinguer code écrit,
qualifié, archivé, publié et réellement activé. CABU suit sa procédure, sans
modifier l'autorité métier ni rejouer une once. Un échec conserve le reçu,
les preuves et la prochaine action ; il n'impose pas le gel des autres RUN.
Les informations vers les sessions concernées respectent l'autorisation de
communication applicable. Une session close n'est jamais réactivée par une
notification. Le propriétaire conserve ses identités, modèle, ressources et
checkpoint ; après activation vérifiée, il reprend le premier jalon non prouvé.
