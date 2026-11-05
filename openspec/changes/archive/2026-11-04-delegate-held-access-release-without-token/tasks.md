## Sous-lots normalisés
Code non attribué ; repère technique delegate-held-access-release-without-token.
Normalisation définitive ACL ultérieure ; aucune attribution implicite.

## 1. Délégation et preuve de libération
Objectif : permettre la clôture ordinaire sans token dans le contexte LLM.
Périmètre recovery/contrôleur ; dépend des gardes de locks/release existantes.
Critères : même RUN/policy, empreinte stable, sans secret/rejeu/levée de garde.
État VALIDÉ (source ; voir QUALIFICATION.md).
- [x] 1.1 Ajouter action, liaison privée et reprise de reçu.
- [x] 1.2 Qualifier gardes, refus, réponse perdue et banc natif.

## 2. Contrat et livraison préparée
Objectif : documenter la voie et ses limites ; dépend du1. Critères tests,
syntaxe/liens/budgets/OpenSpec/statistiques vérifiables. État VALIDÉ (source ; voir QUALIFICATION.md).
- [x] 2.1 Mettre à jour contrat distribué, cadrages et spécification.
- [x] 2.2 Qualifier, archiver et préparer commit/publication/CABU.
