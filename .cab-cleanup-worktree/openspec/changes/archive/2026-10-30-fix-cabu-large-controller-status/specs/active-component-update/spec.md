## MODIFIED Requirements

### Requirement: Registre de maintenance borné à seize Mio
L'updater ordinaire MUST lire intégralement jusqu'à 16 Mio les GET exacts /runs et /status et le fichier privé controller-runs.json. Les autres réponses HTTP MUST conserver 2 Mio et les autres fichiers 4 Mio. Il MUST compter les octets reçus avant de parser le JSON. Un dépassement MUST être refusé sans troncature, purge ou admission partielle. Les contrôles d'identité, génération, permissions, PAUSE et HELD MUST rester appliqués.

#### Scenario: Registre valide au-delà des anciennes limites
- **WHEN** le snapshot dépasse 2 Mio et le fichier privé dépasse 4 Mio, chacun sous 16 Mio
- **THEN** la maintenance conserve toutes les identités et preuves et peut poursuivre après les gardes ordinaires

#### Scenario: Dépassement du registre HTTP
- **WHEN** GET /runs fournit plus de 16 Mio
- **THEN** la lecture échoue avec update-response-too-large avant utilisation du snapshot

#### Scenario: Autre réponse volumineuse
- **WHEN** /api/snapshot dépasse 2 Mio
- **THEN** sa limite reste appliquée et aucune augmentation globale n'est déduite des exceptions /runs et /status

#### Scenario: Statut contrôleur volumineux
- **WHEN** GET /status dépasse2Mio et reste au plus16Mio
- **THEN** le statut complet est lu sans troncature pour vérifier les versions et la readiness

#### Scenario: Statut au-delà de la borne
- **WHEN** GET /status dépasse16Mio
- **THEN** update-response-too-large est conservé et aucun démarrage ou rollback réussi n’est déduit
