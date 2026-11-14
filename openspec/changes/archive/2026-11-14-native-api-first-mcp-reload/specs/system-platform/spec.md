## ADDED Requirements

### Requirement: Accès effectifs sans politique de modes POSIX
CAB MUST utiliser l'accès effectif accordé par l'OS. Il MUST NOT refuser un profil,
un état, une preuve ou une ressource selon des bits POSIX ni normaliser les modes
existants. L'authentification, les identités de processus, l'intégrité des objets
et les refus réels d'accès MUST rester contrôlés sans exposer de credentials.

#### Scenario: Profil lisible aux droits hétérogènes
- **WHEN** le compte effectif peut lire son profil CAB régulier en 0770 ou autre mode
- **THEN** CAB le charge sans chmod et utilise son authentification normale

### Requirement: API native prioritaire de rechargement MCP
CAB MUST privilégier l'API native de l'instance réelle de Codex, Codex CLI ou
OpenCode avant ses replis possédés. Un socket d'un autre app-server MUST NOT
attester la reprise d'un client existant. Chaque requête MUST garder son reçu ;
un effet indécis MUST interdire rejeu et escalade. La reprise MUST préserver
SID/RUN et exiger moteur et catalogue observés dans la version cible.

#### Scenario: API disponible
- **WHEN** l'instance autorisée expose une API native compatible à frontière sûre
- **THEN** CAB demande d'abord son rechargement puis observe le catalogue réel

#### Scenario: API absente ou effet indécis
- **WHEN** aucun point compatible n'est disponible ou son effet reste inconnu
- **THEN** CAB distingue indisponibilité et incertitude, conserve les preuves et ne rejoue aucune requête métier

### Requirement: Dépendance Debian Git
Le paquet Debian CAB MUST déclarer git parmi ses dépendances.

#### Scenario: Métadonnées du paquet
- **WHEN** la release Debian est construite
- **THEN** son champ Depends contient git

### Requirement: Profils et versions distincts des agents
CAB MUST distinguer le connecteur codex-cli de codex et leurs profils par compte.
Il MUST chercher la dernière version CLI sur les releases GitHub stables officielles,
et celle de Codex Desktop dans le dépôt APT ChatGPT, indépendamment du SDK embarqué.
Les caches MUST être distincts et vérifiés quotidiennement à instant aléatoire.
La configuration optionnelle codex_desktop_release_url MUST être une URL HTTPS sans credentials.

#### Scenario: Root CLI et Desktop ade
- **WHEN** les deux programmes sont présents sous des comptes différents
- **THEN** leurs commandes, profils, connexions et fournisseurs de version restent distincts

### Requirement: Première adoption native explicite
CAB MUST préparer les endpoints sous le compte effectif, sans déclarer raccordé
un frontend qui tourne encore en stdio. Le lanceur Codex MUST permettre son
raccordement au daemon fournisseur et la CLI MUST conserver le SID lors de resume.

#### Scenario: Client ancien sans socket
- **WHEN** son daemon est préparé mais son frontend n'est pas encore raccordé
- **THEN** CAB expose adoption_required et attend une vraie liaison IPC sans inventer de preuve

## MODIFIED Requirements

### Requirement: Accès aux parents des ateliers directs
Les parents partagés .cab-tests/<change> nouvellement créés par le service MUST
utiliser le groupe du projet et le mode0770, avec setgid pour l'héritage.
La reprise MUST préserver les modes existants et demander à l'OS l'accès effectif.
Elle MUST NOT refuser un parent à cause de son mode ou de son propriétaire POSIX.
Les chemins liés ou divergents MUST rester refusés pour préserver l'intégrité.
Les dossiers RUN et reçus existants MUST être conservés sans rejeu.

#### Scenario: Parent du service inaccessible au codeur
- **WHEN** un atelier existe avec des modes différents mais un accès OS suffisant
- **THEN** CAB le reprend sans chmod, sans chown et sans changer ses reçus ; un refus OS est diagnostiqué sans réparation de droits

#### Scenario: Parent non sûr
- **WHEN** le parent est un lien symbolique ou son chemin canonique diverge
- **THEN** CAB refuse la préparation sans changer les droits de la cible
