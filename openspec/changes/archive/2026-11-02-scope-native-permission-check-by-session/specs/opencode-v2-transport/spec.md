## ADDED Requirements

### Requirement: Contrôle des permissions natives par session

Le contrôleur MUST demander les permissions natives de la seule session dont
il vérifie l’inactivité. Les permissions d’autres sessions MUST NOT être
validées, examinées ou modifiées au cours de ce contrôle. Une permission en
attente de la session ciblée MUST continuer à bloquer la libération. Les
vérifications d’identité, d’inactivité et de preuve native de la cible MUST
rester en vigueur.

#### Scenario: Permission étrangère mal formée

- **WHEN** une permission étrangère est mal formée et le contrôleur vérifie une autre session
- **THEN** la permission étrangère n’est ni lue ni modifiée et ne bloque pas la libération de l’accès ciblé

#### Scenario: Permission de la session ciblée

- **WHEN** la session contrôlée possède une permission native en attente
- **THEN** le contrôleur refuse la libération avec le blocage existant de session non inactive
