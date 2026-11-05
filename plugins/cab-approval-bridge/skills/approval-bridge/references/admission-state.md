# Admission BUSY/STABLE et décision — CAB2.1.24

## Observation sans autorité

GET /runs/<run_id>/status expose admission={state:BUSY|STABLE,snapshot_only:true}. BUSY signifie seulement qu’une transition de ce RUN est encore en cours ; STABLE signifie qu’aucune n’est observée à cet instant. STABLE ne vaut ni approbation, ni lease/réservation, ni readiness métier, ni garantie qu’un POST ultérieur réussira. Les gardes de cible, identité, révision, suspension, récupération et permission restent réexaminées.

Pour une demande précise, lire GET /runs/<run_id>/decision/<request_id>/admission. Le JSON distingue owner_registered, validation_registered et decision_recorded local au contrôleur, en plus de l’instantané admission. Un propriétaire enregistré ou un compteur undecided positif ne prouvent pas la fin d’une transition. Une demande inconnue reçoit404 avec champs explicites et decision_recorded:null ; une cible appartenant à un autreRUN reçoit409 decision-run-divergent, sans exposer sa décision.

Ce GET est en lecture seule : aucun appel natif, attribution de propriétaire, décision, compteur d’admission ou verrou n’est créé/modifié. La réponse n’est pas cachée. GET /runs/<run>/decision/<request> existant garde son comportement, y compris404vide ; ne pas remplacer sa lecture par une interprétation du nouveau champ.

## Refus et poursuite sur la même identité

Une décision refusée avant traitement par409 run-transition-in-flight expose admissionBUSY et un message filtré. decision_recorded est le booléen local si demande/propriétaire sont connus, sinonnull. Un refus tardif400 pour le même motif garde son statut et decision_recorded, avec admissionBUSY. Ces refus n’enregistrent pas une nouvelle décision et ne reconstruisent aucune approbation native.

Après un tel refus, conserver les identités et les preuves, vérifier la décision réellement enregistrée et réobserver l’admission selon le cadre du pilote. Si une décision est déjà enregistrée, l’observer : ne pas la poster de nouveau. Sinon, seulement après fin de transition, réexaminer la même demande encore indécise, ses révisions, accès et permissions avant nouvelle tentative explicite de décision. Une observation STABLE peut redevenirBUSY immédiatement ; un nouveau refus reste correct et ne justifie ni suppression, nouvelle demande artificielle, once rejouée ou contournement.

Le serveur ne fait ni attente, ni retry, ni décision automatique pour lisser cette course. Les autres refus et gardes restent inchangés ; une absence de décision locale ne prouve pas à elle seule un effet natif absent ou une persistance globale.

## Reprise autonome par l’orchestrateur

Ce cas relève du mandat courant : aucun arbitrage humain ni correctif CAB
n’est nécessaire pour une transition brève qui se résorbe. Le code exact
`run-transition-in-flight` est un refus technique temporaire, jamais une
décision métier REJECTED. READY et une lecture STABLE antérieure ne réservent
pas la prochaine mutation. Appliquer les [cadences](protocol-cadences.md),
sans boucle serrée ni attente globale des autres RUN.

Pour la décision :

1. Conserver RUN, requestId, approval_id, opération, empreintes et payload.
   Lire la décision ciblée et son admission après le refus explicite.
2. Si une décision existe, poursuivre selon cette décision ; ne pas la reposter.
   Un 404 ciblé et decision_recorded=false ne suffisent pas à autoriser un effet.
3. Si la demande reste admise, indécise et STABLE, recontrôler le mandat exact,
   ses identités, versions, révisions, accès et permissions. Si ces preuves
   restent valides, soumettre la même décision sur la même demande.
4. Un nouveau refus de transition conserve ce parcours. Après approbation,
   request_validation peut encore rendre PENDING/next_action=poll_approval :
   observer poll_approval avec le même approval_id jusqu’au résultat natif,
   sans réémettre request_validation ni créer d’identité de remplacement.

Pour `locks/acquire`, le même code409 est émis avant le traitement de cette
tentative. Observer l’admission et le registre de l’opération/accessId exacts.
Un accès déjà HELD se poursuit avec ses preuves existantes, sans réacquisition.
Sinon, après stabilisation, décision APPROVED et préconditions toujours valides,
redemander uniquement la même acquisition au contrôleur, avec le même manifeste,
version, operationDigest et expectedRevisions. WAITING/STALE/conflit ou autre
erreur suivent leur voie propre ; ne pas les traiter comme cette course.

Une réponse perdue ou illisible n’est pas un refus409 prouvé : lire d’abord
l’état autoritaire et conserver l’incertitude. Une once, un shell, un edit ou
un effet métier ne sont jamais rejoués par cette procédure. Ne pas changer une
révision, annuler la demande, redémarrer un composant ou réarmer le RUN pour
contourner BUSY. Si la transition persiste au-delà du budget applicable, ou si
les preuves divergent, conserver les protections, continuer les unités
indépendantes autorisées et transmettre le diagnostic borné au correcteur CAB ;
seule une décision métier hors périmètre est réservée au développeur.

## Qualification et activation

Tests avec transition de reminder maintenue en attente : statut et GET cibléBUSY,409 précoce sans décision/once, RUN voisin toujours disponible ; après libération, STABLE puis décision unique sur la même identité. Tests de course tardive depuisSTABLE, de révision périmée malgréSTABLE, de demande inconnue/étrangère et de lecture sans mutation du registre. Après SCM/publication/CABU vérifiés, les pilotes peuvent employer cette observation sans réarmer les RUN ni changer leur modèle.
