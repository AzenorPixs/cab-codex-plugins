## ADDED Requirements

### Requirement: Attribution structurelle des processus natifs dans une sonde
La sonde SHALL distinguer les ancêtres attestés et le client interactif du
serveur natif par identité, filiation et topologie réseau/terminal stables.
Elle MUST NOT exclure par nom seul. Tout autre processus du scope SHALL rester
candidat ; une couverture inaccessible SHALL rester non qualifiée. Les deux
sondes et protections existantes SHALL rester requises.

#### Scenario: Client interactif attesté et ancêtres du serveur
- **WHEN** des identités stables prouvent la filiation native et le client partage parent, exécutable, terminal et connexion API loopback appariée
- **THEN** ces seuls processus sont attribués à l’infrastructure native et les autres candidats restent contrôlés

#### Scenario: Nom ressemblant ou topologie incertaine
- **WHEN** un processus s’appelle opencode sans preuve complète ou une identité change pendant la capture
- **THEN** il n’est pas exclu et la sonde ne déclare pas la quiescence

### Requirement: Diagnostics de processus bornés
La sonde SHALL limiter ses diagnostics aux PID, startTime, PPID, comm et cwd
relatif nécessaires. Elle MUST NOT lire cmdline ou environ.

#### Scenario: Candidat non attribuable
- **WHEN** un candidat du workspace n’est pas exclu par preuve structurelle
- **THEN** son diagnostic borné permet la revue et la sonde reste non quiescente
