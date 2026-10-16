# archive-session-statistics Specification

## Purpose

Garantir un bilan auditable pour chaque archivage OpenSpec piloté par CAB.

## Requirements

### Requirement: Collecte auditable par spécification

L'orchestrateur CAB SHALL charger le skill embarqué `coding-session-statistics` et
préparer la collecte au début de chaque change piloté. L'orchestrateur CAB SHALL
conserver les bornes temporelles, l'identité du change et de la session, le relevé du
quota hebdomadaire Codex et les sondes prévues par le skill. L'orchestrateur CAB SHALL
utiliser l'outil natif de lecture des quotas sans exiger le skill `cgpt`.

#### Scenario: Collecte commencée tardivement

- **WHEN** le début de la session ou le quota initial n'a pas été mesuré
- **THEN** le rapport indique `N/A` motivé et utilise seulement les preuves disponibles

#### Scenario: Quota inaccessible ou réinitialisé

- **WHEN** l'outil est indisponible ou les deux relevés ne concernent pas la même fenêtre du même compte
- **THEN** le rapport indique `N/A` pour la différence sans empêcher la rédaction des autres statistiques

### Requirement: Rapport obligatoire après chaque archivage réussi

Après chaque archivage OpenSpec explicitement autorisé et réussi, l'orchestrateur SHALL
faire produire `STATISTIQUES.md` dans le dossier réel
`openspec/changes/archive/<archive>/`. L'orchestrateur CAB SHALL relever les quotas
finaux et la fin de session après archivage et avant la synthèse. Le rapport SHALL
respecter les six sections du skill, les pourcentages, les preuves disponibles, les
durées et la distinction entre refus, erreur et exécution réussie.

#### Scenario: Archivage unitaire réussi

- **WHEN** la preuve d'archivage d'un change est observée
- **THEN** un mandat d'édition distinct autorise son rapport, puis son existence, ses six sections et sa cohérence sont vérifiées avant clôture

#### Scenario: Plusieurs changes archivés

- **WHEN** plusieurs changes sont archivés dans le même job
- **THEN** chacun reçoit un rapport avec son périmètre et ses bornes explicites ; les mesures globales ou partagées sont signalées sans attribution inventée

### Requirement: Clôture conditionnée à la preuve du rapport
L'orchestrateur SHALL valider le rapport avant TERMINÉ et MUST préparer les
agrégats en continu. Le contrôleur MAY fournir un brouillon déterministe,
sans LLM ni écriture dans l'archive ; il MUST NOT l'approuver. La publication
MAY précéder le rapport sous phase documentaire, avec réservation conservée.
Un échec MUST laisser le cycle incomplet et se reprendre sans réarchivage.
CAB MUST rester neutre.

#### Scenario: Publication du rapport échouée
- **WHEN** l'archive existe mais l'écriture ou la vérification du rapport échoue
- **THEN** seul le rapport est repris avec un nouveau mandat sans réarchiver ni déclarer le travail terminé

#### Scenario: Archivage refusé ou échoué
- **WHEN** l'archivage n'est pas autorisé ou échoue
- **THEN** aucun rapport n'est présenté comme final et aucun relevé final n'est inventé

#### Scenario: Brouillon natif disponible
- **WHEN** CAB expose le brouillon filtré du contexte de change
- **THEN** l'orchestrateur le contrôle, complète seulement les preuves accessibles et obtient un mandat distinct pour son fichier

### Requirement: Sondes périodiques sans attente du créneau

Pendant une session de codage pilotée, l'orchestrateur MUST prévoir les sondes
statistiques toutes les 30 minutes (1 800 secondes), en complément des sondes
initiale et finale. Il MUST poursuivre le travail entre les échéances et
MUST NOT arrêter le travail pour attendre un créneau ou maintenir une attente
bloquante de trente minutes. La collecte MUST rester distincte du contexte de
travail de l'agent de codage.

#### Scenario: Travail entre deux sondes

- **WHEN** la prochaine échéance statistique n'est pas encore atteinte
- **THEN** l'orchestrateur poursuit les mandats autorisés sans arrêter le travail pour attendre le créneau

### Requirement: Échec statistique distinct d'un échec PLLM

Une relève manquée ou une mesure indisponible MUST être signalée sans
reconstruction rétroactive. Le traitement d'une sonde statistique échouée
MUST rester distinct des nouvelles tentatives illimitées du benchmark PLLM ;
il MUST NOT suspendre le RUN au seul motif de cet échec.

#### Scenario: Relève manquée ou sonde échouée

- **WHEN** une relève est manquée ou une sonde statistique échoue
- **THEN** le rapport conserve la cause sans inventer de mesure et le RUN poursuit son travail autorisé

### Requirement: Données statistiques absentes ou tardives

L'orchestrateur CAB SHALL signaler `N/A` avec sa cause pour toute donnée inaccessible ou
collecte tardive et SHALL ne jamais reconstruire rétroactivement une mesure.

#### Scenario: Données statistiques absentes ou tardives
- **WHEN** une mesure est inaccessible ou la collecte commence tardivement
- **THEN** le rapport indique N/A avec sa cause sans reconstruire la mesure

### Requirement: Rapport individuel pour chaque archive

Chaque archive SHALL posséder son propre rapport, y compris dans un lot.

#### Scenario: Rapport individuel pour chaque archive
- **WHEN** plusieurs changes sont archivés dans un lot autorisé
- **THEN** chaque archive reçoit son propre rapport

### Requirement: Attribution des mesures concurrentes
Le rapport de chaque change MUST identifier RUN et sessions. Les mesures partagées, notamment le quota de compte, MUST être marquées partagées et MUST NOT être attribuées exclusivement au change sans preuve. La publication du rapport MUST précéder la libération normale de la réservation.

#### Scenario: Isolation concurrente
- **WHEN** deux RUN utilisent le même quota
- **THEN** chaque rapport distingue sa télémétrie et la variation globale du compte
