# Context
Le contrôleur sert 503 registry-unavailable lorsque son autorité est perdue. L'API V2 2.2.0 renvoie la location demandée avec x-opencode-directory ; le paramètre directory seul ne suffit pas.

# Goals / Non-Goals
Réduire la coupure CABU sans attendre ni prévenir les RUN ; restaurer les preuves persistées. Ne pas tuer OpenCode, purger les historiques ou rejouer once. Un effet OpenCode déjà lancé peut continuer pendant la coupure : son issue inconnue doit rester protégée et être réconciliée.

# Decisions
Préparer, vérifier et sauvegarder avant arrêt ; mettre en cache les validations syntaxiques par empreinte dans l'état privé. Préparer les remplacements sur le même système de fichiers avant arrêt. Recharger systemd seulement pour des unités modifiées, mais arrêter et démarrer les trois services à chaque update. Le broker natif est déconnecté/reconnecté sans modifier les configurations. Un OpenCode actif mais non vérifiable bloque la réussite globale.

# Recovery
Le journal privé reste l'autorité de reprise. Seuls les artefacts sont restaurables ; jamais un ancien runtime métier. Une perte d'autorité provoque un arrêt non réussi du contrôleur pour laisser systemd restaurer les données persistées. Aucun faux statut sain.

# Validation
Tests de ciblage V2, perte de verrou et restauration, coupures transactionnelles, RUN actifs et permissions consommées, broker actif/absent, import Web indépendant, qualification réelle avec OpenCode lancé et mesures chronométrées.
