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
