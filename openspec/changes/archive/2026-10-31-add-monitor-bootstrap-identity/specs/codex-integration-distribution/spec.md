## MODIFIED Requirements

### Requirement: Priorité du bootstrap du monitoring
Après résolution du workspace canonique, `/CAB start` et le skill MUST
appliquer `monitor-service` avant PLLM, santé OpenCode et prévols. Cela couvre
entrée, reprise et services CAB réutilisés.

#### Scenario: Contrôleur déjà actif
- **WHEN** une reprise trouve le contrôleur actif et le moniteur absent
- **THEN** le moniteur est démarré avant les prévols, sans redémarrer le contrôleur

### Requirement: Identité minimale du moniteur au bootstrap
Le bootstrap MUST vérifier version et workspace par `GET /api/identity`, puis
la page par `GET /`. Il MUST NOT lire `/api/snapshot` pour obtenir cette identité.

#### Scenario: Instance conforme
- **WHEN** l’identité attendue est renvoyée par `/api/identity`
- **THEN** le bootstrap vérifie `/`, réutilise l’instance et rapporte son URL réelle

### Requirement: Résultat borné du bootstrap
Le bootstrap MUST terminer une tentative bornée et rapporter son résultat
avant les prévols. Un échec MUST préserver les autres briques et RUN.

#### Scenario: Monitoring indisponible
- **WHEN** démarrage ou preuve HTTP échoue
- **THEN** la cause et l’URL attendue sont rapportées séparément du statut CAB

### Requirement: Indépendance du bootstrap source
La préparation source MUST NOT exécuter le bootstrap sur un profil réel. Un
échec de PLLM ou d’un prévol amont MUST laisser le moniteur indépendant actif.

#### Scenario: Prévol amont échoué
- **WHEN** PLLM ou un prévol échoue après la sonde du moniteur
- **THEN** le moniteur reste actif sans action sur les autres briques
