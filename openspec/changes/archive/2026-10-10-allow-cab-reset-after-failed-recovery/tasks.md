## 1. Contrat validé

- [x] 1.1 Créer et valider les deltas OpenSpec de l'exception approuvée.

## 2. Protocole et preuves

- [x] 2.1 Aligner AGENTS, commande, skill, référence de purge et documentation avec les préconditions et limites de l'exception.
- [x] 2.2 Ajouter les contrôles du prévol divergent, des deux espaces purgés et des preuves métier préservées.
- [x] 2.3 Aligner les versions distribuées et leurs attentes sur 0.86.9.

## 3. Vérifications avant clôture

- [x] 3.1 Réussir la syntaxe, les suites CAB, les contrôles documentaires, versions, JSON et UTF-8/LF.
- [x] 3.2 Contrôler le périmètre, la cohérence OpenSpec et les avertissements historiques avant archivage.

## Clôture après validations

L'archivage natif synchronise les seules références concernées puis déplace
ce change. Produire ensuite `STATISTIQUES.md` dans l'archive et vérifier sa
présence, ses six sections et ses totaux. Les preuves de ces opérations sont
consignées après exécution dans le rapport, sans tâche circulaire à cocher
avant archivage.

## Preuves avant archivage

- Delta strict valide après conservation des noms de scénarios historiques requis par OpenSpec.
- Node hors sandbox : 35/35 tests réussis, dont refus HTTP du double écart et gardes du protocole distribué.
- Python DEVOPS hors sandbox : 38/38 tests réussis, dont purge de deux espaces fictifs et préservation du checkpoint, des preuves et de l'écriture validée.
- Premier essai Python avec l'interpréteur du sandbox : 37 succès, un sous-processus MCP arrêté par signal 11 sans diagnostic. Cause exacte non déterminée ; aucune source ni attente de test affaiblie. La suite avec l'interpréteur DEVOPS a réussi.
- Syntaxe : trois fichiers Python et quatre fichiers JavaScript modifiés valides.
- JSON, versions, UTF-8/LF et périmètre : réussis, 18 fichiers existants et cinq artefacts du change examinés.
- Code runtime modifié uniquement de 0.86.8 à 0.86.9 ; outil de purge inchangé par empreinte, trois changes historiques et DEVOPS inchangés.
- Référentiel strict avant synchronisation : 13 avertissements historiques de longueur, zéro erreur normative signalée ; 1 spécification valide et 6 en échec strict.
