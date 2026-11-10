## ADDED Requirements

### Requirement: Jobs d’atelier compatibles avec le groupe DevOps

Les jobs d’atelier SHALL accepter les répertoires 2770 détenus par le broker avec groupe parent qualifié et refuser les liens, propriétaires ou groupes non qualifiés et les droits accordés aux autres comptes. Les nouveaux reçus SHALL être créés en 0770. Les reçus privés historiques SHALL rester lisibles après contrôle de leur identité.

#### Scenario: Répertoire normalisé par DIU
- **WHEN** DIU applique 2770 au répertoire de jobs possédé par le broker et au groupe parent autorisé
- **THEN** l’atelier peut accéder aux jobs et les nouveaux reçus sont créés en 0770

#### Scenario: Lien ou autre compte autorisé
- **WHEN** un répertoire ou reçu est un lien, appartient à un propriétaire ou groupe non qualifié ou donne des droits aux autres comptes
- **THEN** le broker refuse avant lecture ou exécution et conserve les reçus

#### Scenario: Ancien reçu privé
- **WHEN** un reçu existant sûr est en 0600 et satisfait les contrôles d’identité
- **THEN** il reste consultable et son identité ne relance pas l’effet déjà enregistré
