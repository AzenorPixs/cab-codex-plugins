## ADDED Requirements

### Requirement: Fermeture après rendu local pour le nouveau profil
CAB MUST attendre la génération et la vérification des rapports du change et du projet après la fin observée du travail de la session de codage. Pour le profil qui reporte les statistiques en Clôture, CAB MUST établir le reçu final sur les fichiers locaux, sans commit ni envoi distant de clôture.

#### Scenario: Rendu terminé après livraison Git
- **WHEN** les effets requis de publication sont confirmés et les rapports générés à la fin de Clôture sont vérifiés
- **THEN** CAB rend le RUN CLOSED et conserve les rapports locaux pour la prochaine publication.

## MODIFIED Requirements

### Requirement: Dernier commit confirmé avant clôture
Pour les RUN soumis au parcours historique de commit terminal, CAB MUST appliquer la politique de dernier commit et vérifier ses envois avant la clôture, en reliant les rapports et destinations au RUN et en protégeant les effets incertains. La clôture hôte sans livraison et la clôture du nouveau profil conservent localement les rapports. Le nouveau profil vérifie les preuves de publication applicables et les rapports locaux avant de rendre le RUN CLOSED.

#### Scenario: Clôture achevée
- **WHEN** les critères et la livraison Git du nouveau profil sont confirmés et le travail est terminé
- **THEN** CAB génère et vérifie les rapports locaux avant CLOSED, sans autre commit ni envoi distant.

#### Scenario: Clôture bloquée
- **WHEN** une session avec dépendances non satisfaites produit `BLOCKERS.md`
- **THEN** CAB conserve le change ouvert, son code non livré et les preuves du blocage. Le nouveau profil conserve les rapports localement pour une publication ultérieure autorisée.

#### Scenario: Échec ou réponse perdue
- **WHEN** un effet Git requis ne peut pas être confirmé
- **THEN** CAB expose l’étape et son reçu, conserve la clôture en attente et protège l’effet incertain contre le rejeu.

#### Scenario: Clôture hôte sans livraison
- **WHEN** le développement direct sans obligation de publication réunit les preuves requises
- **THEN** le reçu de clôture signale une fin sans livraison et les rapports restent accessibles localement.
