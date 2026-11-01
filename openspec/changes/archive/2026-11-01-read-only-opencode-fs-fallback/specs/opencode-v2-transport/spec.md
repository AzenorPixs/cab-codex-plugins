## ADDED Requirements

### Requirement: Routes filesystem V2 liées à la location

Le client V2 MUST utiliser `/api/fs/read/*`, `/api/fs/list` et `/api/fs/find` avec la location native exacte. Les chemins de lecture MUST être relatifs et refuser traversée, chemin absolu et source exclue.

#### Scenario: Location native exacte

- **WHEN** le client appelle une route filesystem V2
- **THEN** il transmet la location exacte en query et en en-tête et conserve le chemin relatif

### Requirement: Réponse filesystem textuelle bornée

La lecture MUST être bornée à 1 Mio par défaut et 2 Mio au maximum. Le client MUST décoder en UTF-8 strict, retourner longueur et SHA-256, accepter uniquement MIME explicitement admis et refuser tout contenu invalide ou excessif.

#### Scenario: Lecture source textuelle native

- **WHEN** le client lit un fichier de la location exacte avec un MIME admis, une taille bornée et du UTF-8 valide
- **THEN** il retourne un instantané read-only contenant chemin relatif, longueur, empreinte et contenu

#### Scenario: Type MIME ou contenu non admis

- **WHEN** une lecture renvoie un type MIME non admis, du UTF-8 invalide ou dépasse la limite
- **THEN** le client annule la réponse et refuse le contenu sans fallback vers une commande

### Requirement: Chemins retournés limités à la location

Les listings et recherches MUST restituer des chemins relatifs sous la location. L'entrée de racine et les chemins externes MUST être omis. Un chemin absolu MUST être converti seulement s'il reste sous la location exacte ; un séparateur final MUST être retiré uniquement pour un directory.

#### Scenario: Listing de racine et chemins externes

- **WHEN** le résultat natif contient une entrée racine, un chemin extérieur, un absolu interne ou un séparateur final de directory
- **THEN** CAB filtre ou normalise ces entrées selon leurs limites de location et de type

### Requirement: Réponse filesystem liée à l'identité native

Le client MUST relire PID, version et répertoire de la session avant et après chaque appel. Une divergence MUST invalider le résultat ; aucune identité ou location déclarée par le client ne peut être adoptée.

#### Scenario: Dérive d'identité pendant une lecture

- **WHEN** le PID, la version ou la location de la session native change pendant l'appel filesystem
- **THEN** le résultat est refusé et l'identité divergente n'est pas adoptée
