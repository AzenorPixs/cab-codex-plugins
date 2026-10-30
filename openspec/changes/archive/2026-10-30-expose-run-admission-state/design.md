# Conception

Le Set transitions reste l’autorité de sérialisation actuelle et n’est pas modifié. admission.state BUSY/STABLE est une projection snapshot_only, pas une readiness métier ou promesse de succès : STABLE peut redevenirBUSY avant le POST et toutes les gardes sont réexaminées. La lecture ciblée n’appelle aucune API native, ne crée aucune identité et ne modifie ni compteur ni décision.

La réponse expose owner_registered, validation_registered et decision_recorded local au contrôleur. Une requête inconnue reçoit404 avec ces champs explicites ; une demande d’un autreRUN reçoit409 decision-run-divergent sans lecture de sa décision. Une décision déjà enregistrée reste observable et ne doit pas être repostée. GET /decision/<id> historique garde son comportement, notamment404vide.

Sur refus précoce409 de décision pendant transition, le JSON ajoute un message filtré, admissionBUSY et decision_recorded (booléen si propriétaire/validation locale connus, sinonnull). Les refus tardifs400 existants ajoutent admissionBUSY, sans changer decision_recorded. Aucune décision n’est inventée, annulée ou rejouée. Le pilote attend/réobserve selon son cadre, lit la décision puis réexamine la même demande réellement indécise ; tout effet inconnu garde ses protections.
