## Context

Le skill autonome déjà présent dans le profil est la source de la copie
initiale. Le plugin CAB découvre les skills sous `./skills/`. Le rapport
est rédigé par les agents à partir de preuves de session, pas par le broker.

## Goals / Non-Goals

Intégrer les statistiques à CAB et rendre leur publication systématique après
chaque archivage réussi. Préserver les six sections et les règles de mesures
du skill existant. Ne pas publier un plugin séparé, modifier Tools Codex,
archiver une autre évolution ni ajouter un collecteur runtime ou une dépendance.

## Decisions

- Copier le skill et ses métadonnées dans
  `plugins/cab-approval-bridge/skills/coding-session-statistics/`.
- Remplacer la dépendance `/cgpt 7u` par l'outil natif
  `mcp__codex_app__get_usage_limits` : quota `codex`, fenêtre de 10080 minutes,
  valeur `usedPercent`, même compte et même réinitialisation. Un outil absent
  produit `N/A`, pas une demande de secret ni une estimation.
- L'orchestrateur prépare les relevés et sondes prévus par le skill avant le
  travail, puis exige après chaque archivage le relevé final et le rapport
  `openspec/changes/archive/<archive>/STATISTIQUES.md`. Un job multi-changes
  conserve des bornes propres à chaque change et un rapport par archive.
- La production du rapport suit un mandat d'édition distinct, autorisé dans
  le périmètre du projet piloté. L'archivage n'est jamais autorisé implicitement.
- La preuve du rapport fait partie des critères de fin du contrat de job.
  En cas d'échec, le cycle reste incomplet, la cause est signalée et l'écriture
  seule peut être reprise ; ne pas réarchiver. Le broker et le gate HTTP
  existant ne lisent pas le projet : ce contrôle appartient à l'orchestrateur.
- La release initiale de cette intégration utilisait la version de base
  commune `0.85.2`, avec le cachebuster Codex du plugin. Le rapprochement CGP
  du 2026-10-10 aligne le delta encore actif sur la référence actuelle
  `0.87.1`, sans réécrire la release initiale ni ses preuves. Les versions
  des schémas de persistance et MCP restent inchangées.

## Risks / Trade-offs

La disponibilité de l'historique et des outils de quota dépend du client.
Un rapport avec `N/A` motivés reste exigible ; une erreur d'écriture ne vaut
jamais rapport publié. La consommation du compte ne peut être attribuée
exclusivement à une session sans preuve. Aucune mesure passée n'est reconstruite.

## Validation

Valider le skill, le manifeste, les spécifications, les tests de distribution
et de cohérence des versions, puis les suites Node/Python existantes. La
lecture du protocole doit confirmer l'ordre archivage, relevé final, rapport,
preuve et clôture, ainsi que le traitement explicite des erreurs et des lots.
Une session CAB réelle reste un contrôle d'intégration distinct : ne pas
annoncer son exécution ni déployer les services dans ce travail source.
