## MODIFIED Requirements

### Requirement: Restauration explicite du job au démarrage

Le contrôleur MUST valider puis restaurer le contrat persistant selon les
formats supportés. La racine MUST être un objet JSON non nul, distinct d'un
tableau, avec les champs obligatoires et types attendus. Seul ENOENT MAY
permettre un démarrage sans job. La restauration valide MUST préserver
jalons, gate et métadonnées de récupération sans les réinitialiser.

#### Scenario: Fichier absent
- **WHEN** le fichier de contrat est absent
- **THEN** le contrôleur peut démarrer sans job enregistré

#### Scenario: Contrat valide
- **WHEN** le fichier contient un contrat valide avec un gate ouvert et des métadonnées de récupération
- **THEN** le contrôleur restaure ce contrat sans inventer de jalon ni d'état terminal

#### Scenario: Racine JSON invalide pour un contrat
- **WHEN** le fichier contient null, un booléen, un nombre, une chaîne ou un tableau JSON
- **THEN** le contrôleur refuse la restauration sans assimiler ce contenu à un fichier absent

#### Scenario: Objet incomplet ou types invalides
- **WHEN** un objet JSON omet un champ obligatoire du format supporté ou présente un type incompatible
- **THEN** le contrôleur refuse la restauration sans réparer le contrat

#### Scenario: Format historique supporté
- **WHEN** un contrat valide d'un format supporté omet un champ historiquement facultatif
- **THEN** le contrôleur conserve sa compatibilité et ne réinitialise pas ses jalons, son gate ou ses preuves

### Requirement: Refus des erreurs de restauration du job

Un JSON malformé, un contrat invalide ou une erreur de lecture autre que
ENOENT MUST arrêter le démarrage avec un code non nul avant HTTP et toute
interaction OpenCode ou Codex App Server. Le fichier persistant MUST rester
inchangé, sans suppression ni réparation automatique.

#### Scenario: JSON malformé
- **WHEN** le fichier de contrat ne peut pas être décodé comme JSON
- **THEN** le contrôleur échoue au démarrage sans interaction externe et conserve le fichier intact

#### Scenario: Erreur de lecture
- **WHEN** la lecture du fichier de contrat échoue avec une erreur autre que ENOENT
- **THEN** le contrôleur échoue au démarrage sans assimiler cette erreur à un job absent

#### Scenario: Contrat décodé mais invalide
- **WHEN** le JSON est décodé mais sa structure ne satisfait pas le format de contrat supporté
- **THEN** le contrôleur échoue avant toute interface ou interaction externe et conserve le fichier intact

### Requirement: Diagnostic de restauration sans contenu persistant

Un refus de restauration MUST distinguer JSON malformé, lecture impossible
et contrat invalide. Le diagnostic MUST NOT reprendre le contenu persistant,
le message brut de l'exception ou le chemin runtime.

#### Scenario: Contenu non exposé
- **WHEN** un contrat malformé contient un marqueur synthétique
- **THEN** le diagnostic identifie l'échec de décodage sans afficher ce marqueur ni le chemin runtime

#### Scenario: Contrat invalide non divulgué
- **WHEN** un objet de contrat invalide contient un marqueur synthétique
- **THEN** le diagnostic indique un contrat invalide sans exposer le marqueur, le chemin ou l'exception brute
