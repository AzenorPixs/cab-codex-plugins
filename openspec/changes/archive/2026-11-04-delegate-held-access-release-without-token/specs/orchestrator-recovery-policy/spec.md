## ADDED Requirements

### Requirement: Libération owner d’un accès sans token de contexte
La récupération SHALL proposer release-access au propriétaire sous policy du même RUN pour un accès HELD non restauré/non quarantiné aux membres terminaux. Elle SHALL lier token/fencing et empreinte en interne puis appliquer locks/release avec ses gardes natives inchangées, seulement COMPLETED ou RECONCILED. Aucun token public, rotation, NO_EFFECT fictif ni libération de bail SHALL être produit. La reprise SHALL exiger le releaseDigest exact.

#### Scenario: Token perdu après compactage
- **GIVEN** le propriétaire valide les preuves terminales et l’issue d’un accès éligible
- **WHEN** il soumet recovery/action avec action release-access et digests frais sans token
- **THEN** le contrôleur recontrôle l’accès et les preuves natives avant la libération ordinaire ciblée
- **AND** le reçu public filtre le token, les once/résultats et autres protections restent conservés

#### Scenario: Frontière ou preuve non qualifiée
- **WHEN** l’accès change, est restauré/quarantiné, un membre reste actif/inconnu ou les gardes ordinaires échouent
- **THEN** la libération est refusée sans forçage et l’effet incertain reste protégé

#### Scenario: Réponse perdue
- **WHEN** l’intention existe sans preuve d’effet
- **THEN** la reprise reste outcome-unverified sans seconde mutation
- **WHEN** l’accès est RELEASED avec releaseDigest exact du reçu
- **THEN** le même reçu est finalisé sans rejeu ni exposition du token
