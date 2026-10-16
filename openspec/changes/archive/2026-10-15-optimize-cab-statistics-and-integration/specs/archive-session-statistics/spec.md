## MODIFIED Requirements

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
