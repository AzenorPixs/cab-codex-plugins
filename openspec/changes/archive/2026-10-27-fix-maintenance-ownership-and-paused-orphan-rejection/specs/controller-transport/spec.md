## ADDED Requirements

### Requirement: Réconciliation de rejet du job courant suspendu
La route de réconciliation MUST accepter recoveryId=null uniquement pour le job armé courant, la session réservée exacte et le RUN sous PAUSE explicite. La preuve native MUST établir une unique soumission identique et un état PENDING corrélé ; un timeout -32001 MUST exiger un polling ultérieur du même approval_id.

#### Scenario: Écriture non exécutée refusée avant admission
- **WHEN** la soumission du job courant a expiré, un polling exact confirme PENDING, le RUN est en PAUSE et aucune permission ou effet n'existe
- **THEN** un reçu REJECTION_ONLY autorise seulement le refus corrélé, sans exécuter ni rejouer l'écriture

#### Scenario: Effet ou identité non prouvée
- **WHEN** la séquence comporte un outil métier, une autre identité, un polling différent, une permission, une décision ou une dérive du préfixe
- **THEN** la réconciliation refuse sans création partielle ni permission

### Requirement: Absence d'effet avant rejet réconcilié
La réconciliation MUST refuser tout outil d'effet, autre demande, permission native, session occupée, décision ou acquisition dans la séquence examinée. Elle MUST recontrôler le préfixe natif avant persistance.

#### Scenario: Préfixe modifié
- **WHEN** les parties natives diffèrent entre l'inspection et le dernier recontrôle
- **THEN** aucun reçu n'est créé

### Requirement: Admission atomique limitée au rejet
Le propriétaire, l'opération et le reçu MUST être persistés atomiquement lorsque l'admission initiale est absente. La validation reconstruite MUST accepter exclusivement rejected, jamais approved ou needs_clarification. Le profil de récupération historique MUST rester compatible.

#### Scenario: Refus de l'approbation
- **WHEN** une décision approved ou needs_clarification est proposée sur une demande réconciliée
- **THEN** le contrôleur refuse sans transmission native

#### Scenario: Ancien contrôleur sans propriétaire
- **WHEN** la route de décision ne peut attribuer la demande non exécutée et une décision explicite de rejet est fournie par l'orchestrateur autorisé
- **THEN** l'outil manuel reject du broker peut enregistrer uniquement ce refus ; le même approval_id MUST confirmer REJECTED avant clôture du mandat, sans faire passer une pause pour une approbation

### Requirement: Compatibilité du reçu générique
Le reçu générique MUST conserver recoveryId=null et les preuves dans le schéma 4. Un ancien lecteur incompatible MUST refuser cet état après premier usage. Un retour à cet ancien lecteur MUST exiger une réconciliation distincte et MUST NOT restaurer un registre antérieur effaçant les nouvelles décisions.

#### Scenario: Retour après premier rejet générique
- **WHEN** un ancien lecteur ne reconnaît pas recoveryId=null
- **THEN** le retour reste bloqué jusqu'à conversion autorisée, sans perte de décision
