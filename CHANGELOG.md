## 2.2.5 — Réconcilier les frontières de validation manquantes

- Le propriétaire peut restaurer la même validation PENDING après une lecture native fraîche, sans décision, nouvelle demande ou permission créée.
- Une lecture native terminée peut être clôturée en coordination après revue épinglée, avec issue explicite NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED : aucune once, nativeResult ou absence d’effet inventée.
- Les intentions et reçus permettent les reprises après réponse perdue et redémarrage ; les identités, sources, révisions et effets contradictoires restent protégés.

## 2.2.4 — Reprises autonomes dans le périmètre validé

- L’orchestrateur décide, revoit et valide les reprises dans le change ; l’aperçu distingue politique à installer et décision réellement hors périmètre, sans sollicitation humaine automatique pour une preuve technique manquante.
- Les refus natifs programmatiques conservent intention et ACK204 privés, sans commandes ni secrets ; une réponse incertaine n’est pas renvoyée.
- Une validation non consommée peut être annulée sur revue bornée de lecture, refus audités et annulation native stable, en conservant approved et l’issue historique indéterminée. Les wrappers de transport relus ne masquent ni admission réelle ni outil exécutant.
- Un port quarantiné peut être réconcilié sur deux sondes natives indépendantes, instance antérieure prouvée et scope relu, sans sortie historique ni NO_EFFECT fabriqué ; l’ancienne once reste acquittée.
- Une extension additive disjointe du manifeste conserve les générations, jetons et protections existants. Les nouvelles opérations gardent leurs propres mandats et permissions.

## 2.2.3 — Confirmation de l’arrêt réel du contrôleur

- CABU reconnaît un contrôleur arrêté avec MainPID=0, que systemd le classe inactive ou failed. L’ancien code de sortie 78 ne fait plus expirer un transfert déjà scellé.
- L’adoption du certificat reste obligatoire ; ni failed avec PID vivant, ni deactivating, ni un transfert absent ou divergent ne prouvent une transition réussie.

## 2.2.2 — Arrêt CABU préservant l’autorité du registre

- CABU termine d’abord le seul processus principal du contrôleur avant l’arrêt du groupe systemd, pour permettre le scellement du transfert avec son helper flock encore vivant. L’unité distribuée utilise KillMode=mixed.
- Une page native réduite pour taille excessive ne réduit plus toutes les pages suivantes ; les bornes de réponse et de pagination restent inchangées, sans retour partiel.
- Une passe de réconciliation réutilise un snapshot natif par session et génération au lieu de relire tout l’historique pour chaque opération. Une clôture continue d’exiger une seconde lecture stable indépendante.

## 2.2.1 — Annulation native après approbation et bootstrap cohérent

- Une validation approuvée encore PREPARED, sans entrée native ni accès, peut être clôturée sur preuve native exacte CANCELLED/OC stable. La décision historique reste conservée, sa réponse exécutable est retirée ; aucune permission once n’est rejouée.
- Les événements de fin native déclenchent aussi cette réconciliation, sans redémarrage obligatoire.
- Le bootstrap du moniteur déduit la version attendue du manifeste du paquet installé ; CABU compare également la révision complète des plugins.

## 2.2.0 — Continuité, récupération et CABU court

- La restitution d’un bail de test nettoyé dépend de ses propres opérations et accès ; une quarantaine sur une ressource disjointe du même RUN conserve ses protections sans retenir ce bail.
- Les validations et décisions sont persistées ; les observations reprennent leur curseur et déclarent les lacunes. Une coupure SSE seule ne change plus l’issue de toutes les opérations.
- Un transfert contrôlé et consommable une seule fois conserve les protections des baux et accès ; un crash ou reçu divergent garde la restauration protégée historique.
- Les shells background explicitement approuvés sont suivis par leur shellID natif jusqu'à une fin exacte, sans fermeture déduite d'un idle ou d'un timeout historique.
- La récupération expose portée, preuves et actions qualifiées par propriétaire, avec politique explicite et reçus idempotents ; un défaut privé d'un RUN n'arrête pas les pairs.
- CABU prépare à chaud, préserve les composants conformes et bascule seulement les groupes nécessaires ; une readiness reprise exige le même broker prouvé et conserve son horodatage natif.
- Le contrat et les commandes se chargent par branche, AGENTS.md provient du template et les mesures INPUT/OUTPUT/cache conservent leur couverture ; aucune économie de facturation n'est inventée.
- Un incident récupérable ne crée plus automatiquement un chat de correctif ; les clôtures et autorisations de communication restent respectées.
- Le programme est qualifié et archivé dans `2026-11-02-track-background-shell-lifecycle` ; les publications et versions opérationnelles restent vérifiées séparément de la qualification source.

## 2.1.81 — Quarantiner un shell timeout sans libérer son port

- Un timeout shell natif sans shellID/exit garde l’opération et son verrou write en quarantine après double preuve native stable.
- Le même RUN peut acquérir un accès read sur ce port pour un contrôle autorisé ; les écritures et les RUN étrangers restent bloqués.
- La quarantine ne termine pas l’opération, ne conclut pas NO_EFFECT et ne rejoue jamais once.
- CAB/CABU, broker, contrôleur, superviseur, moniteur, plugins, commandes et cadrages partagent 2.1.81.

## 2.1.80 — Récupérer un accès HELD restauré après redémarrage

- Le prévol owner/RUN-scoped expose l’accès HELD sans token ni contenu natif.
- La réconciliation vérifie les décisions durables, l’historique natif stable, l’inactivité de session, l’absence de permission, les révisions et les conflits avant de renouveler fencing/token sur le même accès.
- Un reçu idempotent permet la reprise sans réacquisition ni rejeu de `once`; les accès incertains, conflits et effets possibles restent protégés.
- CAB, CABU, broker, services, plugins, commandes et cadrages partagent 2.1.80.

## 2.1.79 — Ignorer les événements après le watermark terminal NO_EFFECT

- La preuve terminale NO_EFFECT est limitée aux trois messages du tour assistant d’origine.
- Un événement V2 non corrélé au message est ignoré uniquement s’il porte une séquence durable strictement supérieure au watermark conservé ; les événements à la frontière ou sans séquence restent bloquants.
- Les gardes d’identité, permissions, session idle, transcript/journal stable et révisions restent inchangées.
- CAB/CABU, broker, services, plugins, commandes et cadrages partagent 2.1.79.

## 2.1.78 — Borner NO_EFFECT au tour natif d’origine

- Une activité read-only dans un tour ultérieur ne bloque plus la preuve terminale antérieure ; les parties et événements du tour d’origine restent strictement qualifiés.
- Les gardes d’accès, permission, callID, `once`, session idle, transcript/log stables et révisions inchangées restent obligatoires.
- CAB/CABU, broker, services, plugins, commandes et cadrages partagent 2.1.78.

## 2.1.77 — Réconcilier un bail de test restauré sans ancien token

- Le prévol read-only scelle le RUN, le bail HELD, ses opérations terminales et la frontière native sans révéler de token. Le propriétaire exact peut réconcilier un bail USED après redémarrage sans ancien token ; CAB renouvelle token/fencing et garde les mêmes ressources HELD.
- La récupération terminale NO_EFFECT peut examiner une opération approuvée existante alors qu’un bail test disjoint est encore restauré, sans créer d’accès ni rejouer `once`.
- Toute activité, permission, opération native incertaine ou divergence conserve les protections ; les baux ne sont jamais déclarés inutilisés par absence de preuve.
- CAB/CABU, broker, services, plugins, commandes et cadrages partagent 2.1.77.

## 2.1.76 — Récupérer un tour terminal sans effet sous readiness bloquée

- Une décision approuvée reste irrécupérable tant que le transcript terminal, le journal synchronisé et l’absence d’effets ne sont pas prouvés deux fois.
- La voie NO_EFFECT invalide l’accord local, puis clôt uniquement l’accès concerné sans avancer les révisions ; toute permission, activité, divergence ou opération sœur maintient UNKNOWN.
- Le cas exact peut être réconcilié pendant qu’un autre RUN bloque la readiness globale ; aucun autre chemin de récupération n’est élargi.
- CAB/CABU, broker, services, plugins, commandes et cadrages partagent 2.1.76.

## 2.1.75 — Lier les commandes Code Mode à clé JSON

- Le binder reconnaît la clé `"commands"` sérialisée par JSON.stringify en plus de la propriété JavaScript non quotée.
- Les clés dupliquées, bindings divergents et expressions dynamiques restent bloqués.
- CAB/CABU, broker, services, plugins, commandes et cadrages partagent 2.1.75.

## 2.1.74 — Cibler l’historique natif dans la location de session

- Chaque page de messages V2 reçoit explicitement la location de la session dans `x-opencode-directory`.
- Les tests vérifient la pagination lorsque la location de session diffère de la location par défaut du client.
- CAB/CABU, broker, services, plugins, commandes et cadrages partagent 2.1.74.

## 2.1.73 — Réconcilier l’annulation native imbriquée Code Mode

- Le contrôleur retrouve `request_validation` dans un wrapper Code Mode complet et non tronqué.
- Une annulation imbriquée n’est clôturée qu’avec le code littéral exact, la découverte et l’appel unique `cancel_approval`, les identités terminales concordantes et un double transcript stable.
- Les appels supplémentaires, contenus divergents et wrappers incomplets restent protégés sans décision ni `once`.
- CAB/CABU, broker, services, plugins, commandes et cadrages partagent 2.1.73.

## 2.1.72 — Fiabiliser le suivi des permissions et validations

- La cause `NONE` est normalisée comme absence de cause et ne bloque plus un RUN sain.
- Le contrôle d’inactivité ne lit que les permissions de la session concernée ; une permission étrangère mal formée n’empêche plus sa libération.
- Une validation annulée par OpenCode peut être close après preuve terminale stable, sans créer de décision ni libérer un effet natif.
- Les causes réelles et les gardes de readiness restent inchangées.
- CAB/CABU, broker, services, plugins, commandes et cadrages partagent 2.1.72.

## 2.1.71 — Réserver les environnements de test malgré des accès disjoints

- Les réservations LXC/Docker ne sont plus bloquées par les seuls accès actifs disjoints du même RUN.
- Les accès recouvrants, les réservations de test existantes et leurs gardes restent protégés.
- CAB/CABU, broker, services, plugins, commandes et cadrages partagent 2.1.71.

## 2.1.70 — Continuer CABU après déconnexion broker confirmée

- Une reprise enfant avec `brokerState=disabled` est admise uniquement via un
  reçu parent superseded dont l’identité OpenCode et la déconnexion sont
  vérifiées.
- Les états MCP incertains et les brokers locaux divergents restent refusés ;
  aucun reload global ni changement de RUN n’est effectué.
- CAB/CABU, composants, plugins, commandes et cadrages partagent 2.1.70.

## 2.1.69 — Restaurer sans perdre les leases actives en conflit

- Le contrôleur conserve les accès actifs restaurés, même si leurs ressources
  se recouvrent ; ils restent protégés contre `once`.
- Les nouvelles acquisitions conflictuelles restent en `WAITING` et les accès
  disjoints continuent, sans effacer ou fusionner de lease existante.
- CAB/CABU, composants, plugins, commandes et cadrages partagent 2.1.69.

## 2.1.68 — Récupérer CABU en avant après rollback contrôleur incomplet

- Une reprise liée au reçu exact `ROLLBACK_FAILED` peut déployer une source
  publiée au moins aussi récente, après vérification d’identité et d’empreintes.
- Les reçus 2.1.67 de rejet natif sont normalisés vers le schéma compatible ;
  les nouvelles empreintes restent dans un champ durable déjà supporté.
- La reprise préserve OpenCode, les données RUN et l’ancien reçu sans recharger
  toutes les locations.
- CAB/CABU, les composants, plugins, commandes et cadrages partagent 2.1.68.

## 2.1.69 — Préserver les accès actifs conflictuels après restauration

- Le contrôleur restaure les leases actifs déjà persistés au lieu de refuser
  l’ensemble du registre lorsqu’ils se chevauchent.
- Chaque lease restaurée reste protégée contre `once` ; les nouveaux conflits
  attendent et les ressources disjointes continuent.
- CAB/CABU, composants, plugins, commandes et cadrages partagent 2.1.69.

## 2.1.68 — Reprendre CABU après rollback contrôleur incomplet

- Une reprise en avant du reçu exact `ROLLBACK_FAILED` vérifie la publication,
  l’identité OpenCode et les empreintes, conserve les sauvegardes et lie le
  nouveau reçu sans rechargement global des locations.
- Les empreintes de rejet 2.1.67 sont normalisées vers un schéma du registre
  déjà lisible par la version précédente ; les nouvelles écritures y restent
  compatibles.
- CAB/CABU, composants, plugins, commandes et cadrages partagent 2.1.68.

## 2.1.67 — Réconcilier les rejets natifs après échec de notification

- Le contrôleur relit deux fois le transcript exact et quiescent avant de
  restaurer un rejet natif `CGPT` localement perdu.
- Le registre persiste le rejet, l’empreinte filtrée et l’état `CANCELLED`
  atomiquement, sans accès, permission, commande ni `once`.
- Le même reçu est restauré de façon idempotente après redémarrage ; toute
  divergence ou activité native conserve le mandat indécis.
- CAB/CABU, les composants, plugins, commandes et cadrages partagent 2.1.67.

## 2.1.66 — Lier le requestId Code Mode aux métadonnées natives

- Le parseur borné accepte un identifiant variable uniquement dans le champ
  `requestId`, en liant sa valeur à l’unique appel natif `request_validation`.
- La corrélation compare les identités structurées sans dépendre de l’ordre des
  clés d’objets ; les tableaux, valeurs, ressources et révisions restent exacts.
- Les expressions dynamiques hors `requestId`, appels supplémentaires,
  divergences, troncatures et wrappers exécutés restent refusés.
- CAB/CABU, les composants, plugins, commandes et cadrages partagent 2.1.66.

## 2.1.65 — Corrélation de request_validation Code Mode en cours

- Le contrôleur peut corréler un appel MCP `request_validation` exact déjà
  observé dans un wrapper `execute` natif encore `running`, sans attendre la fin
  du tour qui dépend de la réponse du broker.
- Le garde exige un appel unique non tronqué, non exécuté et identités exactes ;
  l’admission ne crée ni décision, ni permission, ni `once`.
- Un accès restauré `HELD` sur une ressource disjointe ne bloque plus cette
  admission ; les recouvrements restent soumis à l’acquisition atomique.
- CAB/CABU, composants, plugins, commandes et cadrages partagent 2.1.65.

## 2.1.64 — Réconciliation des fins natives depuis le journal durable

- La reprise lit le journal OpenCode V2 fini et exige son watermark `log.synced`.
- Un succès terminal unique exactement corrélé clôt l’opération sans rejouer
  `once` ; une erreur ambiguë, une absence ou une divergence reste `UNKNOWN`
  avec accès protégé. Aucune réponse `permission.replied` n’est déduite.
- Des accès complets compatibles et non recouvrants du même RUN peuvent
  coexister ; les conflits continuent d’attendre atomiquement.
- CAB, CABU, les composants, commandes, spécifications et documents partagent
  la version 2.1.64.

## 2.1.63 — Reprise sûre des permissions natives après redémarrage

- Les décisions terminales d’opération sont persistées avant la réponse native
  et restaurées uniquement depuis une demande et une approbation natives
  terminées, avec identités et empreintes concordantes.
- Le même `once` peut continuer uniquement lorsque deux observations confirment
  la permissionId et le callID exacts encore pendants, l’outil running non
  exécuté et les révisions valides. Aucun nouvel envoi n’est tenté si la
  permission a disparu, si once est acquitté ou si l’état est inconnu.
- La preuve de reprise est conservée dans le GET scoped par RUN. Une frontière
  inconnue garde ses ressources protégées ; les RUN indépendants sans
  recouvrement continuent.
- La version commune CAB/CABU, des quatre briques, commandes et documents passe
  à 2.1.63.

## 2.1.62 — Projection sûre des opérations natives par RUN

- Ajout d’un GET scoped par RUN pour relire l’état durable des opérations et
  l’accusé `onceAcknowledged` sans exposer les jetons d’accès ou le contenu natif.
- La valeur `onceAcknowledged=false` n’est pas une preuve d’absence d’effet ;
  la procédure conserve la protection jusqu’à la frontière native vérifiée.
- La version commune CAB/CABU et des quatre briques passe à 2.1.62.

## 2.1.61 — Réponses de permissions natives scoped par location

- Les réponses natives `once`, `always` et `reject` utilisent maintenant la
  location de la session ciblée, même lorsqu’elle diffère de la location par
  défaut du client CAB.
- La version commune CAB/CABU et des quatre briques passe à 2.1.61.

## 2.1.60 — Instructions MCP persistantes pour le routage Code Mode

- Le broker transmet au handshake MCP et aux descriptions d'outils une consigne OpenCode Code Mode : utiliser `execute` et le nom exact découvert par `search`.
- Aucun appel direct, shell de repli, décision ou permission supplémentaire n'est demandé ; les autres clients MCP gardent leur contrat.
- CAB/CABU et les quatre briques partagent la version 2.1.60.

## 2.1.59 — Routage explicite des méthodes MCP par Code Mode

- `nativeCodingMandate` distingue les outils natifs write/edit/shell des méthodes MCP CAB, appelées via l’hôte Code Mode `execute` et le nom exact découvert.
- Sans discovery complète ou sans wrapper `execute`, le mandat reste bloqué ; aucun appel MCP direct, shell de repli, décision ou permission supplémentaire.
- CAB/CABU et les quatre briques partagent la version 2.1.59.

## 2.1.58 — Corrélation des CodeMode bruts terminés

- Le contrôleur corrèle aussi un `request_validation` CodeMode dynamique non normalisé lorsque son transcript natif complet atteste l'appel terminé et son identité exacte.
- La voie reste bornée à un appel final unique, éventuellement précédé d'une recherche achevée ; troncature, appel supplémentaire et divergence restent refusés.
- La documentation précise que `execute` est l'hôte Code Mode des méthodes MCP découvertes et ne constitue pas un contournement des permissions.
- Aucune décision, permission ou `once` n'est créé ; CAB/CABU et les composants partagent la version 2.1.58.

## 2.1.57 — Fixture natif de recovery CodeMode conforme au prévol

- Le scénario natif découvre désormais la signature `request_validation` avant `prepare`, conformément aux gardes CAB existantes.
- Aucun comportement produit, décision ou permission ne change ; CAB/CABU et les composants partagent la version 2.1.57.

## 2.1.56 — Corrélation des erreurs MCP CodeMode brutes

- Le contrôleur reconnaît la preuve native complète d'un `request_validation` en erreur même lorsque le wrapper dynamique n'a pas pu être normalisé.
- Un seul appel exact, éventuellement précédé d'une recherche terminée, est admis ; les autres appels, identités divergentes ou métadonnées incomplètes restent refusés.
- Les gardes de décision, permission/once et les états terminaux restent inchangés ; CAB/CABU et les composants partagent la version 2.1.56.

## 2.1.55 — Clôture de la corrélation CodeMode native

- Archive le correctif de corrélation de `request_validation` CodeMode en erreur après validation positive/négative, sans décision ou permission implicite.
- Conserve le terminal `NOT_ADMITTED` de l'ancienne requête ; une reprise métier demande une identité neuve.
- CAB/CABU, les quatre briques et les commandes partagent la version 2.1.55.

## 2.1.54 — Corrélation stricte du request_validation CodeMode en erreur

- Le contrôleur corrèle une notification uniquement lorsque le CodeMode natif prouve l'appel exact `request_validation` en erreur après admission ; aucun marqueur libre ne vaut preuve.
- Les décisions, permissions/once, requêtes terminales et gardes d'identité restent inchangées ; les tests couvrent aussi les identités divergentes et appels supplémentaires.
- CAB/CABU, les quatre briques et les commandes partagent la version 2.1.54.

## 2.1.53 — Clôture de la restitution NO_EFFECT native

- Archive le correctif générique du ledger d’accès après la restitution C12 confirmée, sans replay ni effet métier nouveau.
- Ajoute le delta OpenSpec et le rapport statistique à six sections ; les RUN restent hors des changements SCM.
- CAB/CABU, les quatre briques et les commandes partagent la version 2.1.53.

## 2.1.52 — NO_EFFECT après échec natif d’édition

- Le ledger conserve séparément fin technique et issue native, et relit les opérations héritées sans issue avant restitution.
- NO_EFFECT exige un edit natif en erreur corrélé et des révisions inchangées ; les écritures réussies, commandes échouées et preuves inconnues restent bloquantes.
- CAB/CABU, les quatre briques et les commandes partagent la version 2.1.52.

## 2.1.51 — Clôture du fallback filesystem OpenCode V2

- Archive le change `read-only-opencode-fs-fallback` après preuve de lecture et de listing natifs liés au RUN.
- Réconcilie les deux capacités OpenSpec et ajoute le rapport statistique d’archive à six sections.
- CAB/CABU, les quatre briques et les commandes partagent la version 2.1.51.

## 2.1.50 — Normalisation des entrées de répertoire OpenCode

- Le listing retire le séparateur final des entrées de type répertoire avant validation, sans transformer les chemins fichiers ni élargir la location.
- Le test natif couvre les MIME texte, l’entrée racine, les chemins absolus internes/externes et les séparateurs finaux.
- CAB/CABU, les quatre briques et les commandes partagent la version 2.1.50.

## 2.1.49 — Filtrage des chemins de listing hors location

- Le listing ignore les entrées représentant la racine et filtre les chemins parent/externes ; seuls les chemins relatifs restés dans la location sont restitués.
- Les tests couvrent la racine, un chemin absolu interne, une réponse MIME textuelle et un chemin externe filtré.
- CAB/CABU, les quatre briques et les commandes partagent la version 2.1.49.

## 2.1.48 — Compatibilité des réponses filesystem OpenCode

- La lecture native accepte les types MIME textuels et structurés servis par OpenCode ; les réponses binaires non textuelles restent refusées.
- Le listing normalise les chemins sous la location exacte, ignore l’entrée racine et refuse toujours les chemins sortants.
- Les diagnostics CLI restituent les seuls codes OpenCode contrôlés ; les gardes de RUN/session et les bornes restent inchangées.
- CAB/CABU, les quatre briques et les commandes partagent la version 2.1.48.

## 2.1.47 — Stabilisation du helper de lecture source

- Le helper distribué démarre correctement via son lien stable, et les échecs
  du contrôleur restituent une cause filtrée plutôt qu’une erreur vide.
- La lecture source reste liée au RUN/session OpenCode, read-only et bornée ;
  aucun fallback shell/execute n’est ajouté.
- CAB/CABU, les quatre briques et les commandes partagent la version 2.1.47.

## 2.1.46 — Accès source read-only via OpenCode V2

- Le contrôleur expose la lecture, la liste et la recherche de chemins via les routes filesystem OpenCode V2, bornées au RUN, à sa session et à sa location.
- Les chemins absolus, traversées, sources exclues, sessions occupées/divergentes et réponses excessives sont refusés ; aucune permission, commande ou écriture n’est créée.
- Le helper source-read local restitue un snapshot vérifiable ; les outils natifs absents ne sont pas remplacés par shell/execute dans la session de codage.
- CAB/CABU, les quatre briques et les commandes passent à 2.1.46.

## 2.1.45 — Refus d’admission terminal sans décision

- Un HTTP 400/409 déterministe du contrôleur ferme l’approval en `NOT_ADMITTED`, distinct de `REJECTED` et sans `decision_id`, accès ou permission.
- Les anciens approvals `PENDING` avec diagnostic filtré sont clôturés au prochain poll/GET ou à la réconciliation périodique ; leur diagnostic et l’historique restent conservés.
- Les timeouts, 5xx et diagnostics inconnus restent `PENDING` selon les retries bornés existants. Aucun retry ou nouvel identifiant n’est créé automatiquement.
- CAB/CABU, broker, contrôleur, superviseur, Web et commandes passent à 2.1.45.

## 2.1.44 — Réconciliation des reçus CABU dépassés par le source

- Un reçu historique `RESTARTING` peut être clos `SUPERSEDED` seulement si la récupération MCP autorisée est déjà vérifiée, les artefacts non broker correspondent encore au reçu, et les trois fichiers broker installés sont identiques au paquet CAB plus récent.
- Le garde vérifie les versions actives des services et du broker. La transition ajoutée conserve empreintes et erreurs historiques. Toute divergence conserve le reçu non terminal ; aucun reload déjà vérifié n’est rejoué et aucune nouvelle installation ne démarre dans cette invocation.
- Tests positifs et négatifs isolés, documentation OpenSpec et protocole de reprise mis à jour.
- CAB/CABU, les quatre briques et les commandes passent à 2.1.44.

## 2.1.43 — Récupération autorisée d’un reçu MCP failed

- `--recover-mcp` peut désormais traiter un broker `failed` seulement sur un
  reçu non terminal exact déjà autorisé, après snapshot inactive sans permission
  partagée et identité native inchangée.
- L’intention précède l’unique `POST /api/location/reload` ; l’état `failed`
  ordinaire, `needs_auth`, les locations occupées et les intentions existantes
  restent refusés sans rejeu.
- CAB/CABU, les quatre briques et les commandes passent à 2.1.43.

## 2.1.42 — Preuve ledger-only après compaction native

- Une compaction après acquisition peut utiliser le registre durable seulement
  si toutes les opérations du bail sont terminales, rejetées/annulées sans
  `nativeStart`, sans accès actif ni permission ; le reçu indique le mode de
  couverture.
- Toute opération native démarrée, inconnue, non terminale ou toute permission
  conserve le bail HELD. Les contrôles de frontière et la preview sans jeton
  restent requis.
- CAB/CABU, les quatre briques et les commandes passent à 2.1.42.

## 2.1.41 — Réconcilier les validations rejetées lors d’un bail de test inutilisé

- La récupération tokenless reconnaît un rejet natif corrélé uniquement sans
  permission ni accès associé ; les validations approuvées ou incertaines restent bloquantes.
- Les wrappers Code Mode sont classés sans effet seulement à partir de
  métadonnées natives complètes et d’une liste fermée d’outils CAB ; méthode
  inconnue, commande ou troncature conservent HELD.
- La preview GET fournit un code de blocage et les états d’opération filtrés,
  sans argument, sortie native ni jeton.
- CAB/CABU, les quatre briques et les commandes passent à 2.1.41.

## 2.1.40 — Reprise protégée des baux de test restaurés

- Formalise et teste le replay exact du POST acquire après redémarrage pour
  récupérer le jeton du bail existant, sans créer de réservation ni autoriser
  une commande ; les projections GET restent sans jeton.
- Quand le jeton et le payload original manquent, une preview filtrée puis une
  restitution sans effet sont permises uniquement pour un bail restauré
  inutilisé dans un job armé du même change, après preuve native complète.
- `reconciliationRequired` reste actif jusqu’à réconciliation native ou
  restitution sans effet ; toute divergence, activité ou mutation conserve
  HELD. CAB/CABU, les quatre briques et les commandes passent à 2.1.40.

## 2.1.39 — Corrélation Code Mode statique

- Le client normalise les commandes littérales en template et une constante
  chaîne strictement bornée pour `request_validation`, sans évaluer JavaScript
  ni élargir les permissions ou la corrélation native.
- Les lectures GET des réservations de tests omettent les jetons bearer ;
  les réponses POST autorisées et les gardes des mutations restent inchangées.
- Tests positifs/négatifs isolés et protocole de récupération documentés.
- CAB/CABU, les quatre briques et les commandes passent à la version commune
  2.1.39.

## 2.1.38 — Réconciliation sûre d’une discovery héritée

- `complete` reconnaît dans une recovery RUN historique non signée au plus
  une discovery native `request_validation` exacte, complète, non tronquée,
  horodatée et read-only, quelle que soit sa position dans le transcript.
- Les preuves d’approbation, once consommée, commande exacte exit 0 et
  readiness finale restent obligatoires ; aucune demande ou permission n’est
  rejouée. Les recoveries signées et les preuves dupliquées ou invalides
  restent refusées.
- CAB/CABU, les quatre briques et les commandes partagent la version 2.1.38.

## 2.1.37 — Prévol natif borné pour la récupération

- `prepare` exige désormais la découverte littérale et scellée de `request_validation` avant le gel, ainsi que `shell: ask` et `edit: ask` sur la candidate.
- Toute discovery après le gel est refusée avant admission ; les attentes MCP utilisent un délai fini et conservent le même identifiant d’approbation pour les polls.
- CAB et CABU ainsi que les quatre briques et commandes partagent la version 2.1.37.

# Changelog

## 2.1.36 — Réconciliation des fins natives après SSE terminal

- Après un événement SSE terminal sans partie d’outil exploitable, le
  contrôleur relit le transcript natif uniquement pour les opérations non
  résolues de la session concernée et applique les mêmes gardes de preuve.
- Une commande terminée avec exit non nul clôt l’opération technique, sans
  satisfaire un prévol exigeant exit 0 ni rejouer une permission.
- CAB/CABU et les briques communes sont alignées en 2.1.36.

## 2.1.35 — Retrait des jetons d’accès libérés

- Les accès libérés par `locks/release` ou publication ne conservent plus le
  jeton brut ; le rejeu exact reste vérifié par l’empreinte de la requête.
- Les réponses de libération et les lectures de registre ne retournent plus
  de jeton pour un accès `RELEASED`.
- CAB/CABU et les briques communes sont alignées en 2.1.35.

## 2.1.34 — Identité minimale du bootstrap moniteur

- `/CAB start` vérifie version et workspace par `GET /api/identity` sans lire
  le snapshot multi-RUN destiné au tableau de bord.
- L’endpoint d’identité est en lecture seule, local et ne retourne aucun RUN,
  change, session ou événement. `/api/snapshot` et SSE conservent leur contrat.
- CAB/CABU et les briques communes sont alignées en 2.1.34.

## 2.1.33 — Retrait de l’alias minuscule `/cab`

- `/CAB` devient l’unique commande canonique de pilotage ; le fichier `cab.md`
  et les invocations `/cab` sont retirés des commandes actives et distribuées.
- `/CAB update` synchronise atomiquement `CAB.md` et `CABU.md`, retire l’ancien
  fichier global `cab.md` et restaure le jeu précédent en cas d’échec.
- Les références actives, tests de distribution et briques CAB/CABU sont
  alignés sur la version commune 2.1.33 ; les mentions historiques restent intactes.

## 2.1.32 — Réattachement sûr du plugin de contexte

- Après redémarrage OpenCode, le plugin peut reprendre son PID courant uniquement si l’ancien PID est prouvé mort ; ancien PID vivant ou contrôle indéterminé restent refusés.
- Les règles ciblées de session, modèle, connexion et messages sont conservées sans réécriture.

## 2.1.31 — Fin native avant rattachement

- Réconciliation de la fin native prouvée avant rattachement à un accès conservé ; gardes, jeton et fencing inchangés.
- Après redémarrage, preuve native APPROVED strictement corrélée utilisable sur demande pour rattachement en vue de l’annulation ; aucune permission exécutable restaurée.
- Libération réconciliée existante : annulation et invalidation d’un diagnostic rattaché non exécuté.

## 2.1.30 — Distribution complète du garde de permissions

- permission-policy ajouté au groupe déployé du moniteur par CABU.
- Vérification des imports relatifs par source et destination réelle avant coupure ; un autre groupe ne masque plus une dépendance manquante.
- Import du client réellement installé et refus de paquet incomplet qualifiés ; politique de permissions inchangée.

## 2.1.29 — Permissions avant prévol

- Origine des gels de revue distinguée de CABU ; contrôle structuré requiredNativeAsk avant prompt/MCP et inspection filtrée de politique.
- Prédicat client/contrôleur partagé sans changement de résolution ; refus deny/allow/contexte préservés.
- Sortie de revue minimale explicite par le propriétaire, preuve avant/après et autres deny conservés ; aucun rétablissement automatique.

## 2.1.28 — Pending MCP et récupération CABU

- Attente bornée des transitions MCP sans répétition de connect/disconnect ; intention native durable.
- Reçu MCP_RECOVERY_REQUIRED et reprise vérifiée du même journal, sans boucle de repli ou nouvelle installation implicite.
- Récupération globale explicitement liée au reçu, intention unique non rejouable et contrôles PID/sessions/frontière ; OpenCode, demandes, once et modèles préservés.

## 2.1.27 — Rangement immédiat et couleurs du moniteur

- Vue confirmée appliquée dès la réponse archive/delete/restore, même en mode Manuel ; les anciennes lectures ne réaffichent plus les lignes.
- BLOCKED bleu, DONE vert, STOPPED orange ; sélection, état textuel et WAITING jaune conservés.
- Aucun assouplissement de l’éligibilité ni rangement de sources OpenSpec réelles.

## 2.1.26 — Remédiation des incidents natifs et du moniteur

- Projection GET compacte du registre pour le moniteur, sans relever le plafond de collecte ; causes HTTP/taille/format/délai explicites.
- Helpers explicites de préparation native et diagnostic corrélé des erreurs fournisseur/découverte seule/entrées divergentes, sans retry ou permission.
- Procédure de réconciliation, conservation du choix LLM et revue complète des conducteurs ; les gardes exactes et preuves de tests restent requises.

## 2.1.25 — Porte-mandat Bash exact

- Payload Bash revu et scellé dans le contrôleur, invocation courte liée au SHA256 : le modèle ne recopie plus le corps long.
- Décision, révisions, accès exclusif et once natifs conservés ; longueur/hash/CWD/UTF-8 vérifiés avant payload, sans fichier mutable ni retry.
- Stages privés immuables, idempotence limitée aux métadonnées et refus après restauration/fin ou contexte divergent ; anciens mandats inchangés.

## 2.1.24 — Admission observée et refus de transition

- Instantané BUSY/STABLE du RUN et lecture ciblée de propriétaire/validation/décision locale pour une demande.
- Refus409 précoce et400 tardif enrichis sans changer leurs gardes, statut, unicité ou absence d’effet ; aucune attente/reprise automatique côté serveur.
- STABLE reste une observation, sans réservation ni autorisation ; les pilotes conservent les identités et relisent la décision avant poursuite explicite.

## 2.1.23 — Readiness vide en Code Mode

- Reconnaissance ciblée de broker_readiness({}) lorsque l’unique métadonnée native achevée omet input ; aucun défaut générique d’arguments ajouté.
- Métadonnées et empreinte brute conservées ; formes voisines, erreurs, autres outils et appels ajoutés restent bloquants, sans autorité de décision/permission nouvelle.

## 2.1.22 — Arguments d’écriture vérifiés avant once

- tool_input_sha256 lie les arguments write/edit approuvés à la demande, au retry et à la décision corrélée.
- Le client dérive la preuve de la partie native ; une entrée divergente ou non prouvée invalide le mandat protégé avant once, avec diagnostic filtré et fichier conservé.
- Les anciens mandats restent compatibles sans protection nouvelle revendiquée ; le protocole exige l’empreinte pour les prochains write/edit et conserve la vérification après effet.

## 2.1.21 — Projection portable du contexte

- Hook natif ciblé à chaud pour écarter les anciens raisonnements et métadonnées fournisseur de la seule requête après transition PLLM/compte, sans changer modèle, SID, PID ou histoire enregistrée.
- Connexion opaque vérifiée à chaque génération, portée fermée par messages/session, réponses nouvelles et sessions étrangères conservées.
- Procédure de continuité historique avant reprise, mode2 conservé, qualification synthétique et application réelle séparées.

## 2.1.20 — Lanceur et preuve de continuité

- Helper fournisseur exécutable par son lien installé ; chemins canonique/lié vérifiés avec canal secret privé et effet unique.
- Adoption du modèle explicitement distincte de la continuité historique : nouveaux marqueurs de réponse et contrôle du SID historique avant reprise.
- Cas Responses inter-comptes reproduit sur2.2.0 ; limite de reprise au même modèle documentée, sans effacement, nouveau SID ou réparation native prétendue.

## 2.1.19 — Fournisseur et modèle à chaud

- Transition explicite du choix dans le même job/session avec historique, préparation, prévol natif et reprise sans rejeu ; choix explicite libre de l’ancienne politique, PLLM par défaut.
- Raccord fournisseur V2 par canal secret privé, verrou/reçu non secret et confirmation de connexion ; comportement qualifié sur OpenCode2.2.0 sans reload/dispose ni interruption des pairs.
- SCM réussi suivi de CABU et notification de l’activation ; clés et choix des jobs restent des opérations corrélées des propriétaires.

## 2.1.18 — Entrées modèle explicites

- Refus de model.variant avant tout HTTP dans les créations, sondes, prompts et changements de modèle ; erreur fixe indiquant model.reasoning, sans repli silencieux vers default.
- Lecture native conservée, conversion explicite documentée ; reasoning valide et omission intentionnelle du niveau restent compatibles. Aucun modèle actif modifié par ce correctif source.

## 2.1.17 — Coordination des incidents de codage CAB

- Signalement au chat « Correctif CAB - OC », réutilisé ou créé si absent ; suivi corrélé jusqu’au correctif qualifié et à son activation CABU vérifiée.
- Procédure unique distribuée dans le plugin, le skill et la commande ; retour aux sessions concernées avec preuves, sans transfert de mandat ni rejeu de permission.

## 2.1.16 — Motifs des refus de décision HTTP

- Les400 vides des décisions deviennent JSON filtrés : code précis, message français fixe et indicateur local decision_recorded.
- Causes de révision/admission conservées avant et après contrôle natif ; gardes,409 et201 de succès inchangés, aucune décision/once implicite.

## 2.1.15 — Démarrage CABU et récupération durable

- Build corrigé : GET /status de maintenance borné16Mio, erreur de taille explicite, autres limites inchangées ; reprise du journal avant nouvelle installation.

- Attente de la version contrôleur dans le budget configuré, au démarrage et au rollback ; diagnostic de démarrage conservé.
- Une reprise de rollback échouée reste non terminale et conserve son journal ; les données métier et permissions ne sont jamais rejouées.

## 2.1.14 — Isolation de la location MCP et des sondes

- Découverte serveur sans scope implicite, contrôles MCP à cible vérifiée et refus des arguments divergents ; appelants internes clarifiés.
- Sonde jetable au workspace partagé avec deny global et modèle explicite ; aucune reconnexion automatique. Documentation et exemples courants génériques ; activation distincte après qualification.

## 2.1.13 — Restitution des réservations sans effet

- Route release-unused explicite avec autorisation humaine, attestation exhaustive, relecture native et reçu durable ; aucun nettoyage fictif ni libération sur timeout.
- Gardes de génération, quiescence, restauration et parcours ordinaire conservés ; documentation et jeu commun 2.1.13. Activation distincte.

## 2.1.12 — Diagnostics de notification et refus avant admission

- Dernier diagnostic HTTP/code reconnu conservé et exposé par le broker sous la lease de notification exacte ; champs distants arbitraires exclus, anciennes approbations compatibles.
- Refus locaux de validation comptés une fois par tentative dans le RUN connu, sans admission, décision ou permission implicite. Distribution2.1.12 et consignes alignées.

## 2.1.11 — Erreurs MCP directes et historiques volumineux

- Provenance native directe qualifiée pour le retry historique access_id vide, sans retrait des gardes, altération du transcript ou rejeu once.
- Pagination adaptative sous le plafond inchangé de 2 Mio, sans résultat partiel ; un message unique trop volumineux reste refusé. Consignes CAB et version commune alignées ; activation distincte.

## 2.1.10 — Édition native, récupération et protocole V2

- Qualification isolée de `edit` natif OpenCode 2.2 : signature, remplacement partiel sous CAB ask/once, refus et ambiguïté sans écriture. Consignes V2 dans le skill et la commande CAB ; distinction avec la découverte MCP.
- Un RUN sans mandat attend l’orchestrateur sans prompt automatique du superviseur. Les gardes existantes restent prioritaires ; aucune activation réelle ne découle de cette préparation source.

- Récupération bornée d’un refus MCP V2 avant enregistrement ; schéma access_id non vide, permissions isolées par session sans assouplir les contrôles globaux.
- Métriques natives tokens/coût validées et événements SSE data/location reconnus ; aucune mesure historique reconstruite.
- Priorité de raisonnement medium puis high sur le même modèle, documentée aux nouvelles sessions et reprises avec prévol et réconciliation ; aucun changement des sessions actives par la préparation source.

## 2.1.9 — Acquittement littéral de découverte Code Mode

- Reconnaître un unique search suivi du retour d’une chaîne littérale, avec liste native concordante et non tronquée.
- Conserver une projection diagnostique sans autorité et tous les contrôles MCP/ask/once ; qualifier la forme sur OpenCode 2.2 puis aligner la distribution en 2.1.9.

## 2.1.8 — Preuves natives Code Mode OpenCode 2.2

- Corréler les enveloppes execute strictes avec leurs appels MCP et leur provenance native, en refusant programmes ambigus, résultats transformés et sorties tronquées.
- Vérifier les permissions shell et les écritures relatives depuis leurs appels sources ; conserver once, cible, dates et fin native sans utiliser executed comme preuve autonome.
- Qualifier le prévol et une écriture sur OpenCode 2.2 réel isolé, conserver les frontières des recoveries et aligner la distribution commune en 2.1.8.

## 2.1.7 — Réconciliation explicite des prévols rejetés

- Ajouter reconcile-rejected sous autorité humaine, avec empreinte native et exclusion de tout effet, sans reconstruction de décision exécutable.
- Lier la confirmation et la levée du gel global au reçu du recovery et à la quiescence de la cohorte.
- Conserver les refus du retry ordinaire et exiger un nouveau prévol avec décision et once propres ; aligner la distribution commune en 2.1.7.

## 2.1.6 — Fermeture de CAB avec le serveur OpenCode

- Calculer le sceau de maintenance depuis un instant unique pour éviter un refus artificiel à 60 001 ms, sans relâcher la limite de 60 000 ms.
- Arrêter les trois services et le gardien de verrou après disparition prouvée du serveur OpenCode suivi, avec nettoyage borné et sans boucle systemd.
- Distinguer fermeture du serveur, fermeture d’un client et panne HTTP/SSE ; permettre l’attente avant premier rattachement.
- Conserver RUN, jobs, réservations, décisions et gels sans purge, clôture métier ou rejeu de permission.
- Qualifier EOF MCP avec demande en attente ; aligner la distribution et les attentes de cible en 2.1.6 en conservant les preuves historiques 2.1.5. Aucune installation ni activation par cette préparation source.

## Non publié — Qualification historique 1.7.1 vers 2.1.5

- Aligner le contrat de transition mixte et le banc de maintenance sur 2.1.5.
- Distinguer l’annonce publique reconnue du protocole de test de l’état métier protégé par l’empreinte, en conservant le refus des valeurs inconnues.
- Restaurer le paquet historique épinglé depuis Git et qualifier les essais uniquement dans des fixtures locales.

## 2.1.5 — Pagination et preuve native OpenCode

- Ne plus combiner order et cursor sur les pages suivantes des sessions et messages V2 ; conserver les bornes et refus de pagination.
- Vérifier le prévol V2 d’un échange unique à partir du modèle/variante observés sur l’assistant lorsque le parent les omet, sans fabriquer de métadonnées ni accepter un parent partiel ou contradictoire.
- Conserver les preuves héritées et les jobs existants, et aligner la distribution 2.1.5.

## Non publié — Codes historiques du moniteur

- Reconnaître exactement L1 et L2 depuis le premier titre admissible, sans renumérotation et sans élargir les autres formats à un seul chiffre.
- Couvrir les formats existants, les refus et la lecture de changes actifs et archivés référencés.

## 2.1.4 — Compatibilité des catalogues PLLM

- Accepter les couples stricts schéma 2 / six politiques et schéma 3 / sept politiques ; conserver les gardes de priorité, sélection et dates, ainsi que le raisonnement et le prévol natif.
- Permettre la sélection, la preuve et la conservation de mode7 sans modifier les jobs existants ou réécrire le catalogue.
- Aligner la distribution 2.1.4 et documenter le raccord au catalogue public actif.

## 2.1.3 — Credential de mise à jour et installation mixte

- Prévol du credential systemd avant coupure et raccord explicite `--opencode-password-env-file` à la seule variable OPENCODE_PASSWORD de project.env ; aucune obligation pour les projets sans OpenCode, aucun secret dans les reçus et aucun écrasement de credential différent.
- Politique cab-source compatible avec les releases gérées des services/Web ; les trois modules broker src/ restent ordinaires et les anciens liens restent restaurables.
- Diagnostics systemd filtrés par composant conservés après repli et rapportés par le CLI, notamment 243/CREDENTIALS.
- Base distribuée 2.1.3 et cachebusters renouvelés ; tests source et raccord OpenCode distincts d’une activation réelle du patch.

## 2.1.2 — Codes de lot dans le moniteur

- Colonne « codes de lot » en deuxième position des tableaux RUN et CHANGE, issue du titre du change associé, actif ou archivé référencé.
- Cellule vide sans code explicite ou document admissible ; tris, filtres, compteurs et actions conservés.
- Base commune CAB 2.1.2 et cachebusters des plugins renouvelés ; admission du broker chargé 2.1.1 conservée. Aucun déploiement actif déduit de cette qualification source.

## 2.1.1 — Identifiants CAB en majuscules

- Plugin principal `CAB`, skill `$CAB`, commande `/CAB` et marketplace affichée `CAB Codex Plugins` alignés avec `CABU`, `$CABU` et `/CABU`.
- Sélecteurs d’installation et garde cab-source adaptés au plugin `CAB` ; chemins techniques et alias `/cab` conservés.
- Base commune 2.1.1 pour les quatre briques, plugins, scripts et commandes ; preuve de broker chargé 2.1.0 conservée pour la maintenance qualifiée.

## 2.1.0 — CABU rapide et récupération runtime

- Plugin `CABU`, skill `$CABU` et commande `/CABU` nommés en majuscules ; chemins de distribution alignés.

- Ciblage V2 par x-opencode-directory, sans repli V1.
- Arrêt en échec du contrôleur après perte d’autorité afin que systemd restaure le registre durable.
- CABU prépare les fichiers avant coupure et réutilise les validations syntaxiques liées aux empreintes ; durées de préparation, coupure et total mesurées.
- Redémarrage systématique des trois services ; OpenCode actif exige le rechargement du broker et une preuve fraîche de sa version.
- Coupure sans notification ni modification des RUN ; conservation des décisions consommées et réconciliation des effets inconnus sans rejeu.

## 2.0.0 — Migration exclusive OpenCode V2

- Passage de toutes les briques CAB à la version majeure 2.0.0.
- OpenCode V1 et toutes les versions 1.x sont refusés ; transport HTTP V2 authentifié par Basic Auth, avec credential local protégé.
- Contrôleur, superviseur, moniteur, maintenance, réparation, broker, commandes et documentation migrés vers les contrats V2.
- Les anciens champs de transcript `tools` ne sont pas exposés par le schéma V2 ; la réconciliation qui dépend de cette preuve refuse donc ce cas sans effet.

## 1.10.11 — plugin, skill et commande CABU

- Ajout du plugin CABU autonome et de son skill d’entrée ; `/CABU` reste la commande distribuée séparément et délègue à `/CAB update`.
- Incrément commun des briques CAB à 1.10.11.

## 1.10.10 — alignement de la distribution

- Incrément commun des versions CAB ; `/CABU` reste l’accès direct à `/CAB update`, conformément à la spécification et à l’implémentation existantes.

Toutes les évolutions significatives de CAB seront documentées dans ce fichier.

## 1.10.9 — mise à jour forcée par CABU

- `/CABU` continue de déléguer à `/CAB update`, qui ne consulte plus les états
  RUN ou de coordination avant l'arrêt des trois unités systemd CAB.
- L'update remplace les fichiers des quatre briques et redémarre controller,
  supervisor et monitor à chaque invocation, avec sauvegardes et retour arrière.
- Les fichiers broker sont installés même sans OpenCode ; le rapport marque sa
  version runtime `INDISPONIBLE` lorsqu'elle n'est pas observable.
- Plugin, broker, modules, unités, Web, commandes et package Python passent en
  1.10.9.

## 1.10.8 — mise à jour autonome du bridge

- `/CAB update` et `/CABU` vérifient leur association au plugin et au skill de
  maintenance, suspendent les RUN réservés sous `SHARED_MAINTENANCE`, mettent à
  jour les quatre briques et démarrent les trois unités systemd CAB.
- Le broker géré par OpenCode est reconnecté par les routes MCP natives, avec
  contrôle de `/mcp` et de sa readiness ; OpenCode n'est pas tué ni redémarré.
- Les RUN restent en `PAUSE` ou `STOP`, les gels globaux étrangers restent
  intacts et aucune unité n'est activée au login.

## 1.10.7 — maintenance et demande en pause

- Preuve broker avec propriétaires de fichiers et de répertoire explicitement distincts de l'UID d'exécution ; ancienne preuve compatible, aucun changement de droits ou d'artefact par la maintenance.
- Réconciliation d'une demande du job courant sous PAUSE, même sans admission préalable, limitée au rejet après preuve native PENDING sans effet ; timeout suivi du même polling, persistance atomique et refus des approbations ou acquisitions.
- Distribution commune 1.10.7 ; migration et reprise CISMP autorisées séparément par le développeur, avec vérification des versions réellement actives.

## 1.10.6 — medium par défaut

- Le contrôleur demande medium par défaut pour les nouveaux jobs automatiques.
  Un niveau explicitement fourni par le prompt reste prioritaire ; les
  prévols et reprises conservent exactement le niveau retenu.
- Incrément commun des briques et supports source de 1.10.5 à 1.10.6. Les
  sessions existantes et services actifs ne sont pas modifiés.

## 1.10.5 — préparation source

- Commande canonique `/CAB` en majuscules, avec `/cab` comme alias de compatibilité.
- Ajout de `/CABU` sans argument, équivalent exact de `/CAB update` ; procédure unique,
  dépendance locale de même version et refus des arguments supplémentaires avant effet.
- Distribution du jeu CAB.md, CABU.md et cab.md : préparation complète, vérification
  des versions et contenus, préservation des copies locales divergentes ou plus récentes,
  restauration des seules commandes remplacées en cas d'échec.
- Briques, copies broker, modules, unités, commandes et manifeste alignés sur 1.10.5
  avec cachebuster neuf. Origine 1.10.4 conservée pour la maintenance ; formats et
  marqueurs de protocoles existants inchangés. Aucune activation des services utilisateur.

## 1.10.4 — préparation source

- Monitor : dernière vue et cadence sur une seule ligne après l'identité du workspace, avec défilement local sur petit écran.
- Vue manuelle persistante : états observés, compteurs, sélection et détails conservés entre rafraîchissements, même après perte SSE ou erreur. Les commandes vérifient séparément la fraîcheur courante ; la carte Web garde son expiration de trente minutes.
- RUN et Changes triés par nombre de tâches cochées décroissant, puis identifiant du change alphabétique et identifiant RUN ; avancement inconnu placé après zéro, sans modifier les données sources.
- Toutes les briques, modules, copies broker, plugin, commande et supports courants alignés sur 1.10.4 avec cachebuster neuf. Origine de maintenance 1.10.3 conservée et transition qualifiée à deux UID en environnement isolé, sans installation ni activation des services utilisateur.
- Protocole corrigé dans son référentiel template puis synchronisé vers CAB : bootstrap du Monitor, catalogue des étapes et coordination par ressource réconciliés. Commande et skill conservent le choix PLLM de session et attendent une instruction sans modèle admissible ; les anciennes consignes de benchmark automatique périodique sont retirées.
- Références OpenSpec PLLM réconciliées avec cette attente humaine : anciennes échéances conservées sans réactivation automatique et sondes statistiques indépendantes. Le contrôle documentaire compare désormais les trois références courantes aux supports CAB ; archives et composants actifs inchangés.

## 1.10.3 — préparation source

- Préparation vérifiée du catalogue public du skill actif et patch non secret à transmettre au contrôleur lors du démarrage autorisé ; configuration explicite et options existantes conservées, sans benchmark ni écriture automatique.
- Rapprochement contrôlé opencodego vers opencode-go : identité exacte prioritaire, unicité, connexion et modèle inchangé ; provenance logique conservée avec l'identité native, y compris pour les preuves d'indisponibilité.
- Prévol et indisponibilité compatibles avec parent.info.model.variant et parent.info.variant ; refus des contradictions entre champs parent et assistant, des preuves manquantes et des réponses incomplètes.
- Incrément commun des briques et paquet reproductible ; transition depuis 1.10.2 qualifiée séparément en banc isolé. Publication et activation restent distinctes. Les anciens contrats restent lisibles ; un ancien lecteur strict ne prend pas en charge le nouveau champ logicalProviderID après nouvel armement.

## 1.10.2 — préparation source

- La session de pilotage peut fournir providerMaxBytes à /model-policy/resolve et dans modelSelection à l'armement : budget entier positif en octets appliqué au seul /provider de l'appel, sans plafond fixe ajouté. Omission compatible à 2 Mio, autres observations et catalogue PLLM inchangés.
- Dépassements et valeurs invalides refusés sans corps privé ; budget local, sans changement des modèles ou jobs existants. Incrément commun des briques et compatibilité de maintenance depuis 1.10.1 conservée.

## 1.10.1 — préparation source

- Preuve du broker : reconnaître un enfant créé depuis tout thread du même OpenCode, avec déduplication, contrôle d’identité parent après découverte et gardes UID/commande/parent/unicité conservées. Une disparition de thread concurrente est tolérée ; les autres erreurs restent bloquantes.

- Conserver les clés logiques historiques à la restauration sans donner de nouvelle réservation de test non canonique. Réparation ciblée du candidat sous le même HELD après échec de restauration : reçu et stages initiaux préservés, reprise idempotente, nouvelle release immuable et aucune réécriture du registre métier.

- Maintenance ordinaire : porter à 16 Mio les seules lectures du registre GET /runs et controller-runs.json, sans troncature ni purge ; conserver 2 Mio sur les autres réponses et 4 Mio sur les autres fichiers.
- Tester les refus des bornes et qualifier succès/récupération avec un grand registre et deux UID réels, sans assouplir PAUSE, HELD, propriétés ou identités.
- Aligner les briques, commande, plugin et supports courants sur 1.10.1 ; conserver 1.10.0 parmi les versions broker chargées qualifiées. Installation locale et reprise CISMP restent distinctes de la préparation source, sans action Git implicite.

## 1.10.0 — préparation source

- Correctif de maintenance : admettre la version broker chargée 1.9.0 dans reuse-readonly vers 1.10.0, en conservant la liste fermée et tous les contrôles de preuve ; qualifier succès et récupération avec deux UID réels.

- Modèle de codage : modèle explicite du prompt prioritaire, sinon PLLM automatique ; raisonnement high par défaut, puis xhigh, puis politique de priorité inférieure. Un modèle explicitement imposé incompatible bloque. Catalogue public configurable, prévol natif exact, choix persisté et transmis lors des reprises ; contrats historiques conservés sans adoption implicite. Aucun benchmark fournisseur ou changement d'agent actif par la préparation source.

- Même verrouillage étendu aux navigateurs externes DEVOPS, notamment Chromium et Firefox : fermeture des sessions/processus de test et restitution vérifiée des profils et ports avant libération, sans toucher aux sessions utilisateur préexistantes.

- Réservations durables Docker/LXC par RUN/change, acquisition atomique et attente FIFO par environnement ; les verrous de commandes restent temporaires. Libération après fins natives, nettoyage puis vérification corrélés et réussis, avec reçus idempotents et reprise sans expiration automatique.
- Publication, changement de génération et clôture refusés tant qu'un environnement reste réservé ; les pairs indépendants continuent. Le registre 4 enrichi après premier usage est refusé par les anciens lecteurs stricts.
- Moniteur : liste Manuel, 1s, 3s, 7s, 30s, 1m, 5m, 10m, 30m, choix mémorisé et bouton Actualiser. Le SSE respecte la cadence de la vue et la collecte serveur reste partagée.
- Carte Web Disponible pendant les 30 minutes suivant un rafraîchissement réussi, puis Non observé. Une perte SSE ou un rafraîchissement échoué ne remet pas ce délai à zéro.
- Incrément mineur source 1.9.0 vers 1.10.0, sans déploiement, migration runtime ni changement d'infrastructure.

## 1.9.0 — préparation source

- Politique explicite reuse-readonly : preuve des trois artefacts broker
  existants, aucune installation ou écriture intercomptes de maintenance,
  versions sur disque et réellement chargées distinguées.
- Intention durable avant déconnexion ; gel et récupération après panne ou
  réponse ambiguë, sans faux rollback vers un processus ancien disparu.
- Qualification isolée de deux UID réels et régressions des modes existants.
- Incrément mineur demandé de 1.8.0 vers 1.9.0 pour les sources, distribution
  et supports ; aucune installation, relance réelle, mutation du projet piloté ou Git.

## 1.8.0 — préparation source

- Admission des validations après vérification native ask ; propriétaire et
  opération persistés ensemble avant traitement de décision.
- Réconciliation explicite d'un prévol orphelin PENDING prouvé sans effet,
  avec reçu durable REJECTION_ONLY : seul le rejet est permis, jamais once.
- Profil frozen-recovery-controller avec journal privé BOOTSTRAP_HELD,
  chargement du contrôleur puis adoption native du véritable HELD ; maintien
  du RUN/job/candidate et des frontières, sans assouplir retry ou complete.
- Transition bornée contrôleur 1.8.0 / broker, superviseur et Web 1.7.1
  explicitement qualifiée ; versions du paquet et des processus séparées.
  OpenCode et broker restent ouverts. Le rollback peut rester gelé ; aucun
  retour à un lecteur incompatible après reçu REJECTION_ONLY.
- Jeu source et distribution alignés sur 1.8.0, documentation concurrente
  réconciliée. Aucun déploiement, réparation de récupération vivante ou effet Git effectué.
- Mode explicite managed-release : liens relatifs vérifiés, nouvelles releases
  immuables, bascule des pointeurs et retour arrière conservant les anciennes
  releases ; alignement ordinaire distinct après la récupération mixte.
- Diagnostic approval-metadata par GET depuis une observation native existante,
  sans lecture du magasin privé ni annulation. Une attribution absente reste
  inconnue et une observation historique ne vaut pas preuve actuelle.

## 1.7.1 — préparation source

- /cab update déploie broker, contrôleur, superviseur et Web, y compris actifs,
  avec préparation complète, sauvegardes et gel durable de maintenance.
- Attente d'une frontière sûre, conservation des RUN, pauses et preuves,
  restauration des seuls états actifs initiaux, contrôle des versions réelles.
- Retour arrière des artefacts et récupération après interruption, sans purge,
  migration, permission métier ou redémarrage d'OpenCode ; attente et repli
  incomplet signalés explicitement.
- Outil distribué et broker Python complet synchronisé avec src/ ; jeu aligné
  sur 1.7.1 avec cachebuster neuf. Qualification sur installations simulées,
  sans activation runtime, modification de profil réel ou publication Git.

## 1.7.0 — préparation source

- En-tête CENTRE D’OBSERVATION agrandi et gras ; suppression des textes d'accueil.
- Commandes Démarrer/Arrêter et Redémarrer pour contrôleur, superviseur et broker,
  avec unités fixes, identité des services et garde temporaire de quiescence.
  Broker commandé par le MCP natif ; aucun redémarrage d'OpenCode.
- Carte Web avec état et redémarrage indépendant, confirmé après reconnexion.
- Archivage et suppression logique des lignes admissibles dans un catalogue
  privé du moniteur, menu ARCHIVES et désarchivage des RUN sans reprise métier.
  Aucune modification des sources OpenSpec observées, des RUN réels ou des preuves.
- Alignement des briques et du plugin sur 1.7.0 avec cachebuster neuf ; préparation
  source et tests sur fixtures, sans déploiement ou migration du runtime réel.

## 1.7.0 — préparation source

- Reprise d'un RUN après STOP et libération réconciliée : la suspension de la
  génération close reste dans l'historique et ne bloque plus sa nouvelle
  réservation par le même propriétaire, y compris après redémarrage.
- Conservation des suspensions actives, gels globaux, contrôles de propriétaire,
  génération, dépendances et ressources ; aucune permission native héritée.
- Régressions registre et HTTP et alignement des briques distribuées sur 1.7.0
  avec cachebuster neuf. Les travaux de monitoring 1.6.3 sont conservés.
- Aucun changement de schéma, migration, publication Git ou activation runtime
  effectué par cette préparation source SCM.

## 1.6.3 — préparation source

- Monitoring préparé ou vérifié dès la résolution du workspace, avant PLLM,
  santé OpenCode et prévols modèle/MCP, y compris en reprise et lors de la
  réutilisation du contrôleur et du superviseur.
- Tentative bornée et preuves unité/page/version/workspace rapportées avant
  les contrôles amont ; une panne amont conserve le service web indépendant.
- Toutes les briques et leurs supports alignés sur 1.6.3 avec cachebuster neuf.
  Aucun déploiement réel, changement de schéma ou migration des RUN actifs.

## 1.6.2 — 20 octobre 2026

- Réconciliation de démarrage : un index local des événements évite les
  relectures complètes du journal pour chaque approbation historique sous le
  verrou du magasin, qui pouvaient faire expirer `broker_readiness`.
- Conservation des contrôles d’intégrité, des expirations persistées avant
  journalisation, des erreurs signalées et des décisions corrélées existantes.
- Régressions synthétiques sur les lectures, réparations, expirations et échecs ;
  alignement des briques distribuées sur 1.6.2 avec un nouveau cachebuster.

## 1.6.1 — préparation source

- /cab start prépare et démarre explicitement le service systemd indépendant
  du monitoring, sans activation au login ; instance conforme réutilisée sans
  redémarrage et configuration existante préservée.
- Identité HTTP publique du workspace pour vérifier service, page et version ;
  URL réelle et erreurs de monitoring affichées séparément du statut CAB.
- /cab stop et les réinitialisations conservent le moniteur et ses connexions
  pour afficher les autres composants indisponibles. Aucun couplage systemd,
  arrêt ou redémarrage implicite des autres briques.
- Jeu source aligné sur 1.6.1 avec cachebuster neuf, tests de distribution et
  paquet isolé complet ; fonctionnalités STATS et purge manuelle conservées.
  Aucun déploiement, service actif, migration ou publication modifié par SCM.

## 1.6.0 — préparation source

- Menu STATS sous MONITOR et page statistique avec sélections courant,
  dernière livraison, 24 h/7 j/30 j et filtre RUN. Sources native/importées
  séparées, couverture et fraîcheur visibles ; cumuls hors fenêtre explicites.
- Purge manuelle des historiques statistiques antérieurs à 1/3/7/30/365 jours,
  avec prévisualisation, jeton expirant, confirmation, recontrôle et reçu par
  magasin. Contextes actifs ou référencés, états opérationnels, preuves et
  agrégats globaux protégés ; fichiers JSON conservés et rétention native
  inchangée à 30 jours. Suppression irréversible sans sauvegarde préalable.
- Imports et écritures sérialisés pendant la purge, remplacements atomiques
  privés et erreurs partielles explicites ; POST locaux protégés contre les
  requêtes interorigine, sans cible arbitraire ni purge automatique.
- Briques, supports et plugin alignés sur 1.6.0 avec cachebuster neuf.
  Préparation source uniquement, sans installation, migration active,
  publication ou opération Git.

## 1.5.0 — préparation source

- Cycle de onze étapes nommé et persistant par job, avec retours explicites,
  historique borné et déclarations concurrentes protégées ; anciens jobs
  sans étape conservés. Le gate terminal et les permissions restent distincts.
- Tableau web ETAT / ÉTAPE / tâches cochées ; phase technique dans le détail,
  catalogue et historique consultables, versions réellement observées de chaque
  brique ; lignes WAITING jaunes et BLOCKED rouges, blocage prioritaire sur
  une attente. Version 1.5.0 conservée, sans installation sur les services actifs.

- CAB Monitor indépendant, sans LLM, sur loopback et port configurable 8790
  par défaut : interface responsive, état des briques, RUN et changes,
  filtres, tâches cochées X/Y, phase observée et chronologie corrélée.
- Flux SSE filtré du contrôleur et diffusion vers les navigateurs, avec
  réconciliation périodique, fraîcheur et ruptures de couverture explicites.
  Journal borné sans commandes, messages ou sorties ; observation sans
  décision, permission, relance ou mutation métier.
- Limite effective de commande dans les statuts publics et sur la page,
  en unités UTF-16 ; défaut 16 384, absence affichée comme indisponible.
- Sources, tests, supports et briques alignés sur 1.5.0 avec cachebuster neuf.
  Modèle de service du moniteur distribué séparément ; aucune installation,
  migration de runtime, publication ou modification des services actifs.

## 1.4.0 — préparation source

- Opérations consommées ou invalidées écartées avant toute nouvelle admission :
  le polling ne réinscrit plus une session historique après sa réconciliation.
  Test de régression sur plusieurs sondages, sans nouvelle permission.
- Limite de commande du contrôleur configurable par
  `OC_Codex_MAX_COMMAND_LENGTH` (alias `OC_CGPT_MAX_COMMAND_LENGTH`),
  16 384 unités UTF-16 par défaut ; `2000` rétablit le seuil précédent.
  Configuration invalide refusée au démarrage et dépassement signalé par
  HTTP 400 JSON avant enregistrement, sur les demandes et rappels historiques
  et par RUN. Diagnostic de notification broker filtré, tests aux bornes et
  règle commande exacte / décision corrélée / permission `once` unique conservée.
- Incrément de 0.1.0 de toutes les briques CAB : broker, modules, contrôleur,
  superviseur, scripts, plugin, commande et unités alignés sur 1.4.0.
  Bloc de concurrence du protocole local synchronisé avec la référence
  distribuée ; schémas, contrats de permission et historiques conservés.
  Cette préparation source ne déploie ni ne publie de composant.

## 1.3.0 — préparation source

- Coordination atomique par ressource : portées déclarées distinctes des accès actifs, lectures compatibles, écritures exclusives, FIFO entre conflits et promotion sûre des fichiers privés. Les RUN indépendants continuent pendant validations, synchronisation, archivage et publication ciblés.
- Révisions et preuves ciblées, suivi des écritures à publier, corrections approuvées dans un ensemble détenu, reçus durables et REPORT. Une fin native inconnue conserve ses protections ; décisions, ask/once et gates restent obligatoires.
- Gel global limité à réconciliation commune, maintenance partagée, pause ou arrêt globaux explicites. Pause/arrêt ciblés et supervision préservent les pairs. Registre schéma 4, migration et sauvegarde privées, retour arrière contrôlé ; anciennes acquisitions d'intégration globale refusées dans resource-scoped-v1.
- Statistiques intégrées de contention et d'exceptions, fenêtres natives 24 h/7 j/30 j, courant et dernière livraison observée. /cab stats, statslast, stats 24, stats7 et stats30 restent en lecture seule. Import local filtré/idempotent de l'audit arrêté, sources séparées, lacunes explicites et quotas partagés comparables.
- Toutes les briques sources, commandes, protocoles et supports de distribution sont alignés sur 1.3.0. Qualification isolée et archivages avec rapports ; aucun Git, déploiement, migration active, propagation interprojets ou intervention sur les RUN actifs.

## 1.2.1 — préparation source

- Ajouter `/cab status` et son filtre exact `--run <run_id>` : tableau français
  horodaté avec réalisé, en cours, restant et statut explicite par RUN.
- Recouper preuves et observations actuelles ; afficher le pair réellement
  bloquant, distinguer orchestrateur actif/codeur idle et écarter les anciennes
  attentes levées. Signaler contradictions et indisponibilités sans déduction.
- Consultation ponctuelle en lecture seule, hors boucle de pilotage, sans
  message, permission, écriture, nouvelle session ou action de cycle de vie.
- Aligner briques distribuées, commande, manifeste, unités et attentes de tests
  sur 1.2.1. Aucun déploiement, migration ou intervention sur les RUN actifs.

## 1.2.0 — préparation source

- Alignement des 14 modules, de pyproject, du manifeste avec cachebuster neuf,
  de la commande `/cab`, des descriptions systemd et des cadrages sur 1.2.0.
- Premier lot de réduction de l'exclusion : préparation avant drainage,
  prochain jalon stable prouvé, diagnostics par RUN via `/integration-status`
  et observations natives regroupées avec recontrôles de divergence.
- Libération publiée et entrée en `REPORT` atomiques via `completion` et
  référence attendue ; reçu durable idempotent, génération renouvelée et
  ressources réduites au seul rapport. Registre schéma 3, lecture 1/2/3,
  interfaces historiques conservées et retour arrière à réconcilier.
- Protocole aligné : validations combinées et publication sous exclusion,
  statistiques et gate après libération. Sources et tests isolés uniquement,
  sans déploiement, migration de RUN actif ni validation sur instantané.
- Schémas broker et protocole MCP inchangés ; archives et références
  historiques conservées. Aucun cache installé, service ou RUN modifié.

## 1.1.0 — préparation source du 2026-10-15

- Alignement demandé des briques, du manifeste, des unités systemd et de la
  commande `/cab` sur `1.1.0`, avec cachebuster neuf pour le plugin.
- Statistiques intégrées au contrôleur : agrégats persistants filtrés, exports
  JSON et brouillon Markdown par contexte, latences médiane/p95, couverture
  inconnue et déduplication SSE, sans RUN d'observation ni appel LLM supplémentaire.
- File FIFO d'intégration, réduction quiescente des ressources et phase
  documentaire après publication pour finaliser le rapport hors exclusion globale.
  Les mandats unitaires, once, rapport vérifié et gate restent obligatoires.
- Cadrages et distribution source alignés ; registre schéma 2 pour les nouvelles
  transitions, lecture des schémas 1/2. Aucun déploiement ni migration de RUN actif,
  aucune publication Git ; les références historiques des correctifs sont conservées.

## 1.0.1 — 2026-10-14

- Garde des permissions natives des jobs armés avant admission, approbation
  manuelle/automatique et transmission de `once` ; refus explicite des règles
  absentes, permissives, invalides ou indisponibles et contrôle de la candidate
  avant prévol. Les décisions consommées et la remédiation CISMP3 existante
  restent préservées.
- Réactivation sûre documentée : `noReply`, PATCH des règles `ask`, lecture
  native puis génération sans réécriture par `tools: true`.
- Alignement des briques distribuées sur `1.0.1` avec cachebuster neuf,
  sans nouvelle dépendance, migration, changement de schéma ou protocole MCP.
  Une règle finale globale `ask` est exigée pour le type natif concerné ;
  les usages sans job armé conservent leur compatibilité. Aucune mise en
  service sur les RUN actifs ; une dérive externe après contrôle reste hors
  garantie atomique de CAB.

## 1.0.0 — 2026-10-13

- Schémas d'architecture fonctionnelle et technique détaillée de PROJECT.md
  et README.md alignés sur les sessions parallèles, le broker unique, les
  réservations, les contextes par RUN et la barrière d'intégration.

- Plusieurs RUN CISMP dans un OpenCode et un broker stdio communs : réservation
  atomique des changes et intentions, ressources en lecture/écriture et dépendances.
- Contextes de jobs, permissions once, décisions, générations, gates et reprises
  séparés ; intégration commune exclusive et libération après preuves.
- Readiness et supervision par RUN ; purge globale refusée si un change reste
  réservé ; pas de redémarrage aveugle par le healthcheck en mode concurrent.
- Commande, skills et distribution actualisés ; prompts pilotés des huit projets
  synchronisés, CISM, CAISM et les prompts directs conservés.
- Compatibilité du mode historique unique. Le profil concurrent utilise un seul
  contexte de répertoire ; worktrees et déploiement restent hors qualification.
- Sources préparées et vérifiées localement ; aucune installation de profil,
  activation de service, opération Git ou publication de release effectuée.

## 0.87.2 — 2026-10-10

- Prévol de récupération divergent : conserver la candidate, le même job, le RUN et le runtime, sans renouvellement ni purge.
- Retry explicite après refus sans effet, identifiants neufs, preuves natives séparées par une frontière vérifiée et gel jusqu'au prévol exact.
- Protocole, cadrages et tests alignés ; version 0.87.2 synchronisée. Le remplacement initial CISMP reste inchangé. Aucun déploiement ni publication.

## 0.87.1 — 2026-10-10

- Correctif source 1.0.2 : retry accepte un refus REJECTED obtenu par
  poll_approval/get_approval après timeout MCP, corrélé à une décision locale
  rejected non consommée. Candidate, job, gel et frontières natives conservés ;
  timeout seul, polling divergent, preuve perdue et effets restent refusés.
- Huit ORCHESTRATED_CODING.md, skill et commande CAB alignés ; arrêt ciblé
  explicite du développeur distingué de retry. Briques distribuées 1.0.2 et
  cachebuster neuf, sans migration, nouvelle dépendance, installation ou
  intervention sur les RUN actifs.

- Corrections ACSM du 2026-10-13 : validation des contrats persistés avant
  HTTP et interactions externes ; refus explicite des racines, structures
  et types invalides, sans divulgation ni réécriture du fichier.
- Statut du superviseur complété par le jalon, le gate observé et un compteur
  persistant des émissions de reprise, conservé au redémarrage et au transfert
  du même job. Ancien compteur inconnu, nouveau job à zéro et émission interdite
  en cas d'échec de persistance ; règles de relance et permissions préservées.
- Deltas actifs rapprochés des références 0.87.2, exigences longues réparties
  sans perte de clauses ou de scénarios et inventaire PROJECT complété.
  Étape initiale de correction sans incrément de version, archivage, publication
  ou déploiement. Les quatre propositions approuvées et les trois changes
  historiques finalisés ont ensuite été archivés le 2026-10-13, chacun avec
  son rapport STATISTIQUES.md vérifié ; les références restent inchangées.

- Correction CGP-20261010-05 à 07 : le gate refuse les demandes locales
  indécises même avec un ancien compteur broker nul ; le healthcheck et le
  superviseur acceptent la même URL de base ou `/status`, avec les alias
  historiques et le slash final.
- Activité SSE corrélée à la session du job : trafic étranger, heartbeats et
  trames non exploitables ne retardent plus sa reprise. L'ancienne activité
  est invalidée lors d'un changement de contexte ; gel de récupération et
  décisions unitaires préservés, sans migration ni nouvelle dépendance.
- Régressions isolées avec services simulés ; version source 0.87.1 conservée,
  sans publication, installation de profil ni intervention sur un service réel.

- Récupération automatique orchestrée après prévol divergent ou incomplet
  prouvé et refusé sans effet, notamment champs et délais prescrits omis.
  Le double écart `true` / `change_id` n'est plus requis ; une nouvelle
  divergence sûre renouvelle la procédure sans terminer le RUN parent.
- Checkpoint métier, identifiants neufs, prévol exact, décisions explicites
  et gardes de purge conservés. Un délai MCP seul reste traité par polling ;
  effets inconnus, preuves absentes ou purge partielle bloquent la reprise.
- Briques versionnées alignées sur `0.87.1`, nouveau cachebuster du plugin,
  tests de protocole et de refus HTTP. Aucun nouvel endpoint, schéma,
  déploiement, purge réelle ou publication.

- Protocole des sessions pilotées extrait vers ORCHESTRATED_CODING.md dans
  les huit projets et templates possédant AGENTS.md. Les règles générales
  imposent la lecture du document local ; les contrats techniques, cadences,
  mandats, récupération et clôture y sont regroupés. Les tests de distribution
  vérifient le renvoi et le contenu dédié, sans déclencher de session pilotée.
  Le document est facultatif à l'échelle du projet et réservé aux besoins de
  pilotage ; son absence ne bloque pas les autres projets ou les sessions directes.

- Correction CGP-05 : seule l'absence de `controller-job.json` autorise un
  démarrage sans job. Un JSON malformé ou une autre erreur de lecture refuse
  désormais le démarrage avant HTTP et les interactions avec les composants
  pilotés, avec un diagnostic sans contenu persistant ni chemin runtime.
- Contrats valides, gel, sessions révoquées et fichiers en erreur préservés ;
  aucune réparation automatique, migration ou nouvelle dépendance.
- Tests isolés de restauration et de non-divulgation, puis alignement des
  composants versionnés sur `0.87.0` avec nouveau cachebuster du plugin,
  sans installation de profil, déploiement de service ni changement de schéma.

- Exception de protocole après récupération CAB échouée prouvant `true` au
  lieu de `/usr/bin/true` et un `change_id` divergent : nouvelle session CAB
  autorisée après neutralisation du contexte et purge des deux espaces runtime
  résolus, checkpoint métier et preuves préservés hors purge.
- Nouveau job et prévol exact avec le bon change avant reprise au premier
  jalon non prouvé, sans rejouer les écritures validées. Les reprises ordinaires
  restent sans purge ; gardes, API et outil de purge inchangés. Versions
  distribuées alignées sur `0.86.9`, sans déploiement ni purge réelle.

- Protocole CAB : benchmark PLLM retenté toutes les 30 minutes sans limite
  jusqu'à reprise sûre du même RUN ou arrêt explicite ; checkpoint des
  tentatives, supervision maintenue et contrôles CAB requis avant reprise.
- SSE en temps réel et contrôle des demandes/rapports toutes les 3 secondes ;
  vérifications de progression pendant analyse/rédaction espacées de
  7 secondes fixes, indépendamment de la boucle CAB.
- Sondes statistiques toutes les 30 minutes sans arrêter le travail pour
  attendre le créneau ; leur échec reste distinct d'un échec du benchmark PLLM.
- Alignement des briques distribuées sur `0.86.8` avec nouveau cachebuster du
  plugin et contrôles de distribution. Évolution du protocole de
  l'orchestrateur sans nouvel automate PLLM ni déploiement de service.

- Récupération explicite de session dans le même job par `/job/recover`, en
  deux phases avec contexte et prévol natif vérifiés. Jalons, périmètre et
  corrélation stricte conservés ; anciennes autorisations invalidées, gate
  ouvert et gel persistant en cas de preuve manquante.
- Refus des validations hors session, suspension du superviseur pendant le
  prévol et verrou des outils natifs pour les mandats lecture seule.
- Tests HTTP isolés de récupération, de refus, de concurrence et de reprise.
  Correctif source sans publication, installation ni nouvelle dépendance.
- Alignement du broker, du contrôleur, du superviseur, du plugin, de la
  commande `/cab` et du projet sur `0.86.7` pour ce correctif, avec nouveau
  cachebuster du plugin. Schémas de persistance et protocole MCP inchangés.

- Rappels en mode manuel : aucun thread ni tour Codex auxiliaire ; la
  décision reste réservée à l'orchestrateur principal sur l'interface HTTP.
  Mode automatique, corrélation et consommation unique préservés.
- Régression HTTP des rappels répétés, de l'absence de RPC Codex et de la
  décision explicite unique. Incrément de toutes les briques versionnées
  de `0.86.5` à `0.86.6`, sans changement des schémas ni du protocole MCP.
- Nouvelle session CAB : purge complète de l'ancien runtime, incluant
  approbations, journal, checkpoints, jobs, rappels et conflits Syncthing.
  La persistance reste assurée pendant un RUN et sa reprise.
- Outil de purge distribué avec le plugin, contrôles d'inactivité et de
  verrou avant suppression, refus des cibles invalides et protection des
  fichiers extérieurs. Nouvelle session maîtresse et test CAB obligatoire.
- Alignement du protocole AGENTS, de la skill, de `/cab start` et des cadrages.
- Incrément des briques CAB de `0.86.4` à `0.86.5` ; schémas et protocole MCP
  inchangés. Suppression historique sans sauvegarde acceptée ; aucune
  publication ou modification Syncthing incluse.

## 0.86.4 - 2026-10-05

- Recherches de présence indexées dans les appels de liste d'approbations :
  une seule lecture initiale d'un journal cohérent remplace les relectures
  par approbation sous le verrou du magasin, même si la réponse est filtrée.
- Index local à chaque appel et actualisé après écriture durable réussie ;
  expirations, réparations, erreurs, intégrité des append et résultats préservés.
  Aucun accès au journal pour un magasin vide.
- Tests isolés de liste, d'idempotence, de persistance et d'erreurs, avec une
  fixture représentative et un contrôle déterministe du nombre de lectures.
- Alignement du broker, du contrôleur, du superviseur, du plugin, de `/cab`
  et de `pyproject.toml` sur `0.86.4` ; schémas et protocole MCP inchangés.

## 0.86.3 - 2026-10-03

- Recherches d'événements indexées dans la première boucle de réparation
  post-crash : un journal déjà cohérent n'est plus relu pour chaque
  approbation avant l'initialisation MCP.
- Index temporaire actualisé seulement après une écriture durable réussie ;
  récupération synchrone, contrôles de cohérence et d'intégrité, verrous et
  autres réparations conservés.
- Tests isolés de récupération, d'idempotence, d'erreurs et d'initialisation
  MCP, avec contrôle du nombre de lectures du journal.
- Alignement du broker, du contrôleur, du superviseur, du plugin, de `/cab`
  et de `pyproject.toml` sur `0.86.3` ; schémas et protocole MCP inchangés.

## 0.85.3 - 2026-09-29

- Option booléenne `strictCommands` dans le contrat de job, persistée et
  exposée dans son état public. Pour la session et le répertoire concernés,
  seule la commande exacte approuvée est corrélée ; tout suffixe, y compris
  l'instrumentation de sortie OpenCode, reste sans approbation native.
- Le comportement instrumenté existant est conservé lorsque l'option est
  absente ou vaut `false` ; les valeurs non booléennes sont refusées.
- Tests HTTP du refus des suffixes, de l'approbation de la commande exacte,
  de la consommation unique et de la compatibilité du mode existant.
- Alignement du broker, du contrôleur, du superviseur, du plugin et de `/cab`
  sur `0.85.3` ; versions de schéma et protocole MCP inchangées.

## 0.85.2 - 2026-09-29

- Intégration de `coding-session-statistics` au plugin CAB, avec lecture native
  des quotas Codex et sans dépendance à Tools Codex ou au skill `cgpt`.
- Le protocole impose un `STATISTIQUES.md` par archive OpenSpec réussie, avec
  relevés finaux après archivage et preuve du rapport avant clôture normale.
- Données absentes explicites et reprise d'un rapport échoué sans réarchivage.
- Alignement du broker, du contrôleur, du superviseur, du plugin et de `/cab`
  sur `0.85.2` ; aucun changement des versions de schéma ou de protocole MCP.

## 0.85.1 - 2026-09-25

- `/cab update` installe ou actualise atomiquement le superviseur et son unité
  systemd utilisateur, sans activer ni démarrer le service.
- Son résumé compare désormais aussi les versions distante et locale du
  superviseur.
- Alignement du broker, du contrôleur, du superviseur, du plugin et de `/cab`
  sur `0.85.1`.

## 0.84.4 - 2026-09-23

- Le contrôleur exige désormais un gate terminal local avant une clôture CAB
  normale et expose son état via `/status`.
- Le gate refuse une clôture sans état terminal explicite, sans readiness
  broker ou avec validation active ou en attente.
- Alignement du broker, du contrôleur, du plugin et de `/cab` sur `0.84.4`.

## 0.84.3 - 2026-09-21

- `/cab start` vérifie avant toute session persistante que le fournisseur, le
  modèle et le niveau de raisonnement configurés dans OpenCode répondent
  effectivement dans un prévol sans outil ni accès au projet.
- En cas de preuve absente ou divergente, CAB publie `CAB_INACTIF` sans lancer
  de session pilotée.
- Alignement du broker, du contrôleur et des commandes sur la version `0.84.3`.

## 0.84.2 - 2026-09-21

- `/cab update` affiche les versions GitHub et locales du plugin CAB, du
  contrôleur, du broker actif et de la commande CAB.
- Alignement du broker, du contrôleur et des commandes sur la version `0.84.2`.

## 0.84.1 - 2026-09-21

- `/cab update` migre de façon réversible la marketplace CAB locale vers sa
  source GitHub, actualise son instantané puis réinstalle le plugin si nécessaire.
- Alignement du broker, du contrôleur et des commandes sur la version `0.84.1`.

## 0.84.0 - 2026-09-21

- `/cab update` synchronise la commande de profil avec
  `AzenorPixs/cab-codex-plugins` au lieu d'une source incorrecte.
- Alignement du broker, du contrôleur et des commandes sur la version `0.84.0`.

## 0.74.0 - 2026-09-19

- `/cab update` vérifie désormais aussi la commande CAB du profil Codex face à
  `AzenorPixs/tools-codex` et la remplace atomiquement si GitHub est plus récent.
- Alignement du broker, du contrôleur et du plugin sur la version `0.74.0`.

## 0.73.0 - 2026-09-19

- Ajout de `/cab update`, qui compare la version du plugin CAB et celle de sa
  marketplace avant de déléguer une mise à niveau nécessaire à Codex.
- Alignement du broker, du contrôleur et du plugin sur la version `0.73.0`.

## 0.72.1 - 2026-09-14

- Le contrôleur corrèle désormais une commande Bash lorsque OpenCode ajoute
  uniquement son instrumentation de sortie déterministe reconnue.
- Toute autre transformation de commande reste non corrélée et ne reçoit pas
  de permission native.
- Alignement du broker, du contrôleur et du plugin sur la version `0.72.1`.

## 0.72.0 - 2026-09-14

- Le contrôleur démarre désormais en mode de décision `manual` par défaut afin
  que l'orchestrateur conserve la décision corrélée de chaque mandat.
- Alignement du broker, du contrôleur et du plugin sur la version `0.72.0`.

## 0.71.0 - 2026-09-14

- Documentation du contrôleur CAB supervisé par le service utilisateur
  `cgpt-approval-bridge-controller.service`, avec redémarrage automatique et
  sans processus éphémère pendant un RUN.
- Alignement de la commande `/cab` sur ce même service pour `start` et `stop`.
- Alignement du broker, du contrôleur et du plugin sur la version `0.71.0`.

## 0.69.1 - 2026-09-14

- Le contrôleur accepte désormais toute racine de projet absolue fournie au
  démarrage, sans liste codée en dur de projets pilotés.
- Conservation des protections existantes : exécution hors sandbox déclarée et
  interface HTTP limitée au loopback.
- Alignement du broker, du contrôleur et du plugin sur la version `0.69.1`.

## 0.69.0 - 2026-09-14

- Le mode de décision manuelle du contrôleur devient le comportement par défaut,
  pour conserver les mandats PENDING jusqu'à une décision HTTP corrélée de
  l'orchestrateur.
- Conservation du mode de décision automatique existant, de la corrélation
  `requestId` / `approval_id` / `change_id` et de la consommation unique des
  permissions OpenCode.
- Alignement des versions du broker, du contrôleur et du plugin sur `0.69.0`.

- Correction de la validation des mandats unitaires : une commande unique peut
  désormais être validée avec une liste `files` vide.
- Passage à des mandats unitaires : Codex pilote et valide chaque opération
  OpenCode, y compris l’archivage OpenSpec ; CAB ne transmet qu’une décision
  corrélée à une permission native unique.
- Alignement du plugin, de la commande `/cab` et des cadrages sur la session
  OpenCode persistante et l'état MCP natif `/mcp`.
- Correction de la documentation des variables du broker vers les noms
  effectivement implémentés `CGPT_*`.
- Uniformisation de la terminologie utilisateur sur Codex, tout en conservant
  les identifiants techniques historiques `cgpt-validation` et `CGPT_*`.
- Établissement du socle OpenSpec des capacités CAB.
- Normalisation de l'arborescence du plugin Codex.
- Déplacement de la marketplace Codex et du plugin à la racine du dépôt pour la distribution GitHub privée.
- Réparation du contrat HTTP du contrôleur local.
