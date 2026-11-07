## ADDED Requirements

### Requirement: Ressources DevOps déclarées dans les ateliers
CAB SHALL exposer RO les outils/interpréteurs/bibliothèques locaux déclarés dans DEVOPS.md, leurs préfixes et liens nécessaires, sans exécuter le texte ni charger de secrets. L’inventaire SHALL être borné, consultable par atelier_status, actualisé avant tout nouvel essai et son SHA-256 conservé. Après régénération, un reçu existant SHALL être renvoyé sans relance. Les ressources indisponibles/protégées SHALL être signalées.

#### Scenario: Venv lié au Python DevOps
- **WHEN** DEVOPS.md déclare un interpréteur de venv dont le binaire cible dépend d’un préfixe externe
- **THEN** l’atelier peut exécuter cet interpréteur et charger ses bibliothèques, sans écrire dans le préfixe ni le projet

#### Scenario: Inventaire régénéré entre deux essais
- **WHEN** DEVOPS.md change avant une nouvelle identité d’essai
- **THEN** le catalogue et son empreinte sont actualisés ; une identité d’essai déjà enregistrée ne relance aucune commande

### Requirement: Ressources externes et protections conservées
Les ressources Docker/LXC, services, sockets et périphériques déclarés SHALL être identifiées dans le catalogue avec leur voie CAB existante et réservations requises. Une déclaration SHALL ne pas monter un socket de contrôle, activer le réseau, allouer une ressource supplémentaire ou fournir des secrets. Les accès web et effets hors atelier SHALL conserver leurs validations. Le lanceur SHALL maintenir projet/runtimes RO, seul atelier propre RW, pairs masqués et secrets protégés.

#### Scenario: Docker et LXC déclarés
- **WHEN** un projet déclare un socket Docker et un conteneur LXC de test
- **THEN** le catalogue indique la voie d’accès CAB ; le socket n’est pas monté et aucun effet distant n’est émis par la découverte

#### Scenario: Outils système avec identité et navigateurs locaux
- **WHEN** un exécutable a besoin de getpwuid ou des configurations de navigateur
- **THEN** l’atelier fournit une identité Unix synthétique, une configuration Chromium vide et les polices système RO ; les comptes et scripts de configuration privés hôte ne sont pas exposés
