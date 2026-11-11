## ADDED Requirements

### Requirement: Accès autonomes partagés par opération
Le profil de coordination autonome MUST acquérir les chemins nécessaires ensemble
avant chaque exécution. Les opérations incompatibles MUST attendre mécaniquement ;
les opérations disjointes MUST continuer. Une fin incertaine MUST conserver ses
protections. Une révision attendue devenue périmée MUST refuser l’effet.

#### Scenario: Deux codeurs sur un document partagé
- **WHEN** deux exécutions veulent modifier le même chemin
- **THEN** une seule démarre, l’autre attend sans validation intermédiaire du pilote

### Requirement: Reçus complets et refus actionnables
Une soumission MAY référencer les essais par leur requestId ; CAB MUST résoudre
leurs empreintes complètes depuis son registre. Toute empreinte fournie MUST être
comparée strictement. Les gardes de résultat, révision, couverture et revue finale
MUST rester inchangées. Un refus MUST exposer un motif fermé et l’index du test
lorsqu’il est connu, sans contenu sensible et sans rejouer d’essai.

#### Scenario: Empreinte tronquée
- **WHEN** une soumission fournit une empreinte divergente
- **THEN** elle est refusée avec receipt-digest-mismatch et l’index concerné

#### Scenario: Empreinte non recopiée par le LLM
- **WHEN** un test terminal connu est référencé sans empreinte fournie
- **THEN** CAB joint l’empreinte complète du reçu existant avant les validations habituelles
