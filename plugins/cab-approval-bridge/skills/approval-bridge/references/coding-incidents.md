# Incidents pendant le codage CAB

## Destination et responsabilité

Pendant toute session de codage utilisant CAB, l’orchestrateur transmet tout
problème rencontré avec ce protocole au chat nommé exactement
**« Correctif CAB - OC »**, afin d’améliorer et d’optimiser CAB. Cette demande
humaine couvre la coordination des incidents CAB entre la session d’origine
et ce chat ; elle ne transfère pas les décisions natives ni les mandats métier.
La procédure est portée par l’orchestrateur, pas par un envoi autonome des services.

Avec les outils de conversations disponibles, rechercher le titre exact et
vérifier son contexte CAB. Réutiliser le chat existant et mémoriser son identité
pour cet incident. Inclure les résultats archivés accessibles dans la recherche
avant de conclure à l’absence ; conserver le contexte et utiliser les opérations
prises en charge pour reprendre un chat existant. Si la recherche confirme
qu’il n’existe pas, créer un seul chat **« Correctif CAB - OC »** dans le projet
CAB, avec le signalement initial et le mandat de coordination. Résoudre la
racine CAB depuis les métadonnées du projet, sans chemin de consommateur
codé en dur. Relire les résultats juste avant création pour éviter un doublon.

Si le chat courant est déjà **« Correctif CAB - OC »** dans le contexte CAB,
consigner et traiter le signalement ici, sans auto-message ni nouveau chat.
En cas d’homonymes ambigus ou d’outil de recherche/création/messagerie absent,
indiquer la limite au développeur et conserver le signalement au checkpoint ;
ne pas déclarer le chat créé ou averti sans résultat positif de l’outil.

## Signalement factuel et filtré

Transmettre dès le constat, sans attendre la fin de la session :

- le symptôme, l’heure, l’étape et le comportement attendu ;
- la version source, installée et réellement active lorsqu’elles sont connues,
  en laissant inconnue une mesure non observée ;
- les identités RUN/job/session/demande/approbation utiles à la corrélation,
  le statut HTTP, le code et le motif filtré, ainsi que les preuves accessibles ;
- les effets prouvés, l’absence d’effet prouvée ou l’incertitude restante,
  l’état des permissions et le checkpoint de reprise ;
- une reproduction minimale si elle est sûre, déjà autorisée et isolée.

Séparer les faits des hypothèses. Ne transmettre ni secret, credential,
contenu privé, transcript complet ou source métier inutile au diagnostic CAB.
Un problème local de protocole suffit à ouvrir le signalement ; une cause CAB
supposée n’est jamais présentée comme démontrée.

## Coordination jusqu’au correctif et à CABU

Conserver un suivi corrélé au même incident et au même chat jusqu’à la fin du
correctif **et** de la mise à jour effective de CAB via **CABU**. Échanger les
nouvelles observations utiles, les résultats de reproduction, la proposition
ciblée, les preuves de qualification et l’état de livraison. Ne pas multiplier
les messages identiques, les correctifs concurrents ni les relances aveugles.
La session correctif coordonne le correctif sous son mandat autorisé ; un
signalement n’étend pas les droits d’édition, de publication ou de maintenance.

La session d’origine reste propriétaire de son RUN, job, session, modèle,
checkpoint, accès et décisions. Elle traite ou réconcilie ses effets courants
avant une frontière de maintenance coordonnée. Une demande en attente ou un
effet inconnu reste préservé et attribué à son propriétaire ; aucune once,
permission ou décision n’est rejouée pour réparer CAB. Les unités indépendantes
peuvent continuer dans leur mandat lorsque les preuves permettent de le faire.

Distinguer explicitement : correctif écrit, testé, archivé, publié, puis activé.
Une source corrigée, un paquet installé ou une publication ne prouvent pas
l’activation. CABU suit sa procédure canonique et ses autorisations ; préserver
OpenCode, les RUN et les preuves. Si le correctif ou CABU est bloqué, échoue ou
est interrompu, conserver l’incident ouvert, ses preuves et les conditions
vérifiables de reprise ; ne pas annoncer une clôture ou un succès fictif.

Après CABU, le chat correctif communique aux sessions concernées le résultat
terminal, les versions réellement actives des quatre briques, la readiness
fraîche du broker, les commandes distribuées et la preuve d’activation. Chaque
orchestrateur vérifie son contexte, réconcilie les demandes et effectue les
prévols requis avant de reprendre uniquement ses mandats autorisés. Une session
clôturée reçoit une information, sans réactivation. Clore le suivi seulement
après correction qualifiée, activation vérifiée et retour aux sessions
concernées ; conserver la référence durable de l’incident et de sa résolution.

## Diagnostic et reprise qualifiés

Pour catalogue MCP/natif, erreur fournisseur avec fragment refusé, conducteur incomplet et registry indisponible, appliquer [native-coding-recovery.md](native-coding-recovery.md). Conserver chaque incident séparé, son origine externe ou CAB démontrée, ses preuves et la portée réelle du correctif.
