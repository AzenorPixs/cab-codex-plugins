## ADDED Requirements

### Requirement: Adoption et continuité historique distinguées
Une transition completed MUST indiquer que l’adoption du choix ne prouve pas la continuité historique. Le protocole MUST exiger une preuve native sans outil dans la session historique avant RESUME, distincte d’une sonde neuve. Une erreur de métadonnées chiffrées liées au compte MUST NOT devenir une incompatibilité de raisonnement ou déclencher une nouvelle PLLM. Aucun historique ou secret réel MUST être lu/modifié pour la qualification.

#### Scenario: Sonde fraîche réussie et histoire non portable
- **WHEN** la nouvelle connexion fonctionne en sonde fraîche mais l’histoire existante reçoit un refus de contexte chiffré
- **THEN** la session reste sous frontière sûre, le choix valide et le blocage de continuité sont distingués sans nouveau SID ni effacement

#### Scenario: Mécanisme natif absent
- **WHEN** le contrat2.2.0 et le banc exact ne fournissent pas de parcours conservant les contraintes demandées
- **THEN** le rapport indique la limite, ses preuves et conditions de reprise sans annoncer une réparation ou une API inventée
