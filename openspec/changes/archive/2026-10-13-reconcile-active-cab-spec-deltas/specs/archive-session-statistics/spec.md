## MODIFIED Requirements

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
