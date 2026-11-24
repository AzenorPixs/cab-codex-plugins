## ADDED Requirements

### Requirement: Suivi et notification des publications d’artefacts

CAB MUST ouvrir l’overview dès la demande manuelle et suivre le même reçu. CAB MUST afficher la progression réelle avec une coche verte par étape réussie et une croix rouge interactive par étape en échec ou indéterminée. Il MUST retirer le résultat de publication en bas du bloc de forge.

#### Scenario: Parcours adapté à l’artefact

- **WHEN** un ou deux types d’artefacts sont publiés
- **THEN** CAB affiche les préparatifs et pour Docker la connexion, l’envoi, la confirmation des tags et la rétention, et pour Debian la vérification des tags Git, la publication vérifiée et la rétention
- **AND THEN** un clic sur l’erreur révèle son diagnostic public sans exposer de secret ni de sortie brute.

#### Scenario: Notification terminale commune

- **WHEN** une publication manuelle ou une livraison automatique se termine
- **THEN** CAB publie une seule notification terminale horodatée, regroupant Docker et Debian et leurs forges le cas échéant, avec logos, états et diagnostics développables
- **AND THEN** CAB conserve la distinction entre réussite, échec, résultat indéterminé et publication non exécutée.
