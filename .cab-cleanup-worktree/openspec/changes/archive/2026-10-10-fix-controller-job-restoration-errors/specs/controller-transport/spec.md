## ADDED Requirements

### Requirement: Restauration explicite du job au démarrage

Le contrôleur MUST restaurer un contrat de job valide selon le format existant.
Seule l'absence du fichier, signalée par ENOENT, MAY être traitée comme un
démarrage normal sans job. Les jalons, le gate et les métadonnées de récupération
MUST rester conservés lors d'une restauration valide.

#### Scenario: Fichier absent
- **WHEN** le fichier de contrat est absent
- **THEN** le contrôleur peut démarrer sans job enregistré

#### Scenario: Contrat valide
- **WHEN** le fichier contient un contrat valide avec un gate ouvert et des métadonnées de récupération
- **THEN** le contrôleur restaure ce contrat sans inventer de jalon ni d'état terminal

### Requirement: Refus des erreurs de restauration du job

Un JSON malformé ou une erreur de lecture autre que ENOENT MUST arrêter le
démarrage du contrôleur avec un code non nul avant toute interface HTTP ou
interaction avec OpenCode ou Codex App Server. Le fichier persistant MUST
rester inchangé, sans suppression ni réparation automatique.

#### Scenario: JSON malformé
- **WHEN** le fichier de contrat ne peut pas être décodé comme JSON
- **THEN** le contrôleur échoue au démarrage sans interaction externe et conserve le fichier intact

#### Scenario: Erreur de lecture
- **WHEN** la lecture du fichier de contrat échoue avec une erreur autre que ENOENT
- **THEN** le contrôleur échoue au démarrage sans assimiler cette erreur à un job absent

### Requirement: Diagnostic de restauration sans contenu persistant

Un refus de restauration MUST produire un diagnostic explicite distinguant
un JSON malformé d'une lecture impossible. Ce diagnostic MUST NOT reprendre
le contenu persistant, le message brut de l'exception ou le chemin runtime.

#### Scenario: Contenu non exposé
- **WHEN** un contrat malformé contient un marqueur synthétique
- **THEN** le diagnostic identifie l'échec de décodage sans afficher ce marqueur ni le chemin runtime
