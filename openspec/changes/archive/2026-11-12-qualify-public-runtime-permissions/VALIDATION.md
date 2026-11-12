# Validation — runtimes publics CAB3.0.2

## Autorité et périmètre
Dépendance nécessaire à la livraison SCM validée ; le développeur a autorisé
les modifications nécessaires à la création du paquet Debian CAB sans nouvelle
validation. La release3.0.1 déjà publiée reste immuable ; livraison incrémentale3.0.2.
Aucune nouvelle dépendance, migration SQL, modification de compte ou profil SSH.

## Défaut observé et conservation
Le contrôle final sous UID1000 a échoué sur un fichier public Django root:root0750.
Reçu FINAL-PROOFS-301, terminal COMPLETED/exit1, digest
f5f1be80eb9441b0a36facfa17fa973dc93f0bc76c775b7c2aa807630f16fd22.
Aucun rejeu de cette requête ; les suites suivantes ont leur identité propre.

## Preuves exécutées le12novembre2026
- Deux tests spécifiques : umask0077, droits publics et secret privé inchangé,
  import et exécution sous UID distinct, refus d’archive altérée conservant l’existant.
- Suite combinée PostgreSQL de fixture :25tests réussis.
- Source package_install appliquée au runtime public réel de fixture : succès.
- Nouveau processus MCP sous UID65534 en fixture : initialisation, liste des outils,
  présence run_reconcile_archive et lecture santé READY réussies.
- Correction immédiate des seuls droits publics de l’hôte : nouveau processus MCP
  sous UID1000, même contrôle réussi ; fichiers privés et contenus non modifiés.
- Syntaxe des trois fichiers du correctif contrôlée ; frontend reconstruit avec succès.
- Contrat OpenSpec du change validé en strict avant implémentation et après tests.

## Cohérence documentaire
AGENTS.md1.2 et CODING_RULES.md0.1 restent inchangés depuis leur inclusion validée.
La référence AGENT_INTEGRATIONS.md du socle reçu reste absente, sans invention
normative dans ce correctif ; le mandat SCM/CAB explicite régit le travail autorisé.
PROJECT.md, TECHNICAL.md, README.md et BUILD.md portent la version courante3.0.2 ;
la procédure de droits est dans docs/platform-operations.md. CHANGELOG.md décrit
le correctif3.0.2 et conserve le delta fonctionnel complet3.0.1 depuis3.0.0.
DEVOPS.md est conservé et non régénéré par cette session. Cartographie et registre
reçoivent uniquement le lien ciblé de cette dépendance, sans allocation de code.
Le contrat canonique sera synchronisé par l’archivage autorisé.

## Livraison
CI/CD DIU, vérification d’assets et CABU3.0.2 suivent l’archivage et le rapport.
Les preuves d’installation du paquet final sont distinctes des tests source.
