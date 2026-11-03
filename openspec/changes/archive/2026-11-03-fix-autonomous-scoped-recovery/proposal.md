# Récupération autonome dans le périmètre validé du change

Code de lot : code non attribué ; attribution ACL ultérieure.

## Why

Le développeur délègue les décisions, revues et validations dans le change à
l’orchestrateur ; il intervient uniquement hors périmètre. CAB 2.2.3 renvoie
encore vers human sans politique, ne conserve pas les ACK de refus natifs et
refuse une extension de ressources dès qu’un accès reste actif, même disjoint.
PA01 conserve une validation non consommée après deux refus programmatiques ;
Vite conserve une once consommée et un port quarantiné dont la fin est inconnue.

## What Changes

- Décideur technique : orchestrateur ; preuves insuffisantes décrites comme
  diagnostic à mener, pas comme demande humaine automatique.
- Reçus privés durables des refus natifs, sans rejeu d’une réponse incertaine.
- Diagnostic natif par opération, filtré, borné et sans effet.
- Revue explicite par le propriétaire d’une validation PREPARED non consommée,
  commande de lecture revue, annulation native exacte, refus audités et double
  observation stable. Annulation de la validation, exécution historique toujours
  indéterminée ; aucune once créée, aucun NO_EFFECT natif inventé.
- Réconciliation d’un port quarantiné sur deux diagnostics natifs indépendants
  prouvant port non écouté et absence de processus dans le périmètre relu ;
  historique sans exit conservé, accès RECONCILED et once inchangée.
- Extension additive de ressources disjointes avec CAS du manifeste, sans changer
  les générations, tokens, accès ni opérations déjà détenus.
- Distribution CAB/CABU 2.2.4, SCM puis publication, CABU et rapport aux propriétaires.

## Capabilities

### Modified Capabilities
- `orchestrator-recovery-policy`: autorité, diagnostic et revue bornée.
- `opencode-v2-transport`: reçus des refus natifs et corrélation filtrée.
- `concurrent-run-coordination`: extension additive compatible.
- `supervision-remediation`: demande humaine uniquement hors mandat validé.

## Impact

Client natif et nouveau journal privé, recovery/controller/registre, références,
tests et versions. Schéma 4 du registre conservé ; aucun changement manuel du
RUN Pixs. Vite n’est pas déclaré terminé ; un remplacement reste un nouveau
mandat et une permission native propres. Pas de dépendance supplémentaire.
