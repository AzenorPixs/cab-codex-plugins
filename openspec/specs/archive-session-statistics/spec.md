# archive-session-statistics Specification

## Purpose

Garantir un bilan auditable pour chaque archivage OpenSpec piloté par CAB.

## Requirements

### Requirement: Collecte auditable par spécification

L'orchestrateur CAB SHALL charger le skill embarqué `coding-session-statistics`
et préparer la collecte au début de chaque change piloté. Il SHALL conserver
les bornes temporelles, l'identité du change et de la session, le relevé du
quota hebdomadaire Codex et les sondes prévues par le skill. Il SHALL utiliser
l'outil natif de lecture des quotas sans exiger le skill `cgpt`. Il SHALL
signaler `N/A` avec sa cause pour toute donnée inaccessible ou collecte
tardive et SHALL ne jamais reconstruire rétroactivement une mesure.

#### Scenario: Collecte commencée tardivement

- **WHEN** le début de la session ou le quota initial n'a pas été mesuré
- **THEN** le rapport indique `N/A` motivé et utilise seulement les preuves disponibles

#### Scenario: Quota inaccessible ou réinitialisé

- **WHEN** l'outil est indisponible ou les deux relevés ne concernent pas la même fenêtre du même compte
- **THEN** le rapport indique `N/A` pour la différence sans empêcher la rédaction des autres statistiques

### Requirement: Rapport obligatoire après chaque archivage réussi

Après chaque archivage OpenSpec explicitement autorisé et réussi,
l'orchestrateur SHALL faire produire `STATISTIQUES.md` dans le dossier réel
`openspec/changes/archive/<archive>/`. Il SHALL relever les quotas finaux et
la fin de session après archivage et avant la synthèse. Le rapport SHALL
respecter les six sections du skill, les pourcentages, les preuves disponibles,
les durées et la distinction entre refus, erreur et exécution réussie.
Chaque archive SHALL posséder son propre rapport, y compris dans un lot.

#### Scenario: Archivage unitaire réussi

- **WHEN** la preuve d'archivage d'un change est observée
- **THEN** un mandat d'édition distinct autorise son rapport, puis son existence, ses six sections et sa cohérence sont vérifiées avant clôture

#### Scenario: Plusieurs changes archivés

- **WHEN** plusieurs changes sont archivés dans le même job
- **THEN** chacun reçoit un rapport avec son périmètre et ses bornes explicites ; les mesures globales ou partagées sont signalées sans attribution inventée

### Requirement: Clôture conditionnée à la preuve du rapport

L'orchestrateur SHALL inclure la preuve du rapport dans les critères de fin du
job et SHALL ne pas demander une clôture normale `TERMINÉ` avant sa validation.
Un échec d'archivage SHALL ne jamais être présenté comme un archivage réussi.
Un rapport impossible à écrire ou à valider SHALL laisser le cycle incomplet
avec une cause et une reprise explicites. CAB SHALL rester un transport neutre ;
ni le broker ni le contrôleur SHALL rédiger le rapport ou approuver un mandat.

#### Scenario: Publication du rapport échouée

- **WHEN** l'archive existe mais l'écriture ou la vérification du rapport échoue
- **THEN** l'orchestrateur signale le blocage et reprend le rapport avec un nouveau mandat sans réarchiver ni déclarer le travail terminé

#### Scenario: Archivage refusé ou échoué

- **WHEN** l'archivage n'est pas autorisé ou échoue
- **THEN** aucun rapport n'est présenté comme final après archivage et le relevé final correspondant reste en attente

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
