# Admission BUSY/STABLE et décision — CAB2.1.24

## Observation sans autorité

GET /runs/<run_id>/status expose admission={state:BUSY|STABLE,snapshot_only:true}. BUSY signifie seulement qu’une transition de ce RUN est encore en cours ; STABLE signifie qu’aucune n’est observée à cet instant. STABLE ne vaut ni approbation, ni lease/réservation, ni readiness métier, ni garantie qu’un POST ultérieur réussira. Les gardes de cible, identité, révision, suspension, récupération et permission restent réexaminées.

Pour une demande précise, lire GET /runs/<run_id>/decision/<request_id>/admission. Le JSON distingue owner_registered, validation_registered et decision_recorded local au contrôleur, en plus de l’instantané admission. Un propriétaire enregistré ou un compteur undecided positif ne prouvent pas la fin d’une transition. Une demande inconnue reçoit404 avec champs explicites et decision_recorded:null ; une cible appartenant à un autreRUN reçoit409 decision-run-divergent, sans exposer sa décision.

Ce GET est en lecture seule : aucun appel natif, attribution de propriétaire, décision, compteur d’admission ou verrou n’est créé/modifié. La réponse n’est pas cachée. GET /runs/<run>/decision/<request> existant garde son comportement, y compris404vide ; ne pas remplacer sa lecture par une interprétation du nouveau champ.

## Refus et poursuite sur la même identité

Une décision refusée avant traitement par409 run-transition-in-flight expose admissionBUSY et un message filtré. decision_recorded est le booléen local si demande/propriétaire sont connus, sinonnull. Un refus tardif400 pour le même motif garde son statut et decision_recorded, avec admissionBUSY. Ces refus n’enregistrent pas une nouvelle décision et ne reconstruisent aucune approbation native.

Après un tel refus, conserver les identités et les preuves, vérifier la décision réellement enregistrée et réobserver l’admission selon le cadre du pilote. Si une décision est déjà enregistrée, l’observer : ne pas la poster de nouveau. Sinon, seulement après fin de transition, réexaminer la même demande encore indécise, ses révisions, accès et permissions avant nouvelle tentative explicite de décision. Une observation STABLE peut redevenirBUSY immédiatement ; un nouveau refus reste correct et ne justifie ni suppression, nouvelle demande artificielle, once rejouée ou contournement.

Le serveur ne fait ni attente, ni retry, ni décision automatique pour lisser cette course. Les autres refus et gardes restent inchangés ; une absence de décision locale ne prouve pas à elle seule un effet natif absent ou une persistance globale.

## Qualification et activation

Tests avec transition de reminder maintenue en attente : statut et GET cibléBUSY,409 précoce sans décision/once, RUN voisin toujours disponible ; après libération, STABLE puis décision unique sur la même identité. Tests de course tardive depuisSTABLE, de révision périmée malgréSTABLE, de demande inconnue/étrangère et de lecture sans mutation du registre. Après SCM/publication/CABU vérifiés, les pilotes peuvent employer cette observation sans réarmer les RUN ni changer leur modèle.
