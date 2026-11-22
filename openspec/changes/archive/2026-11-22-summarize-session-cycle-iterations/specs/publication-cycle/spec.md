## ADDED Requirements

### Requirement: Synthèse persistée des itérations du RUN
CAB MUST persister dans PostgreSQL le nombre d’itérations, les bornes et la durée du dernier cycle, le cumul de tous les cycles mesurés et leurs ventilations CAB, Agent(s), Attente, sans double comptage. Electric MUST diffuser cette synthèse au RUN autorisé. Les données absentes ou partielles MUST être signalées. Informations MUST reprendre l’ordre défini par le scénario suivant.

#### Scenario: Consulter Informations
- **WHEN** Informations est ouvert
- **THEN** mandat, étape, nombre d’itérations, début et fin du dernier cycle, total des cycles, CAB, Agent(s), Attente, demandes indécises, cause/attente et RUN bloquants apparaissent dans cet ordre.

#### Scenario: Deux itérations terminées et une ouverte
- **WHEN** deux cycles mesurés et un cycle ouvert existent pour le RUN
- **THEN** le compteur vaut trois, le cumul contient les deux durées connues, sa couverture est partielle et la fin et durée du dernier cycle restent non observées.

#### Scenario: Actualisation des preuves
- **WHEN** une projection temporelle évolue
- **THEN** CAB persiste la nouvelle synthèse et Electric actualise Informations et Résumé sans changement d’onglet.

### Requirement: Durées explicites du résumé et des actions
Résumé MUST afficher « Durée totale de tous les cycles » sous les étapes, et « Durée totale du dernier cycle » après une barre verticale à droite du titre des étapes. Chaque tableau Actions · Itération MUST ajouter Durée après Retour ou validation. Le format commun MUST afficher des secondes jusqu’à 60 secondes incluses, minutes et secondes au-delà, heures, minutes et secondes au-delà de 60 minutes. Une durée absente MUST rester non observée.

#### Scenario: Action longue et deux cycles
- **WHEN** une action dure 3661,2 secondes et les deux cycles durent 100 et 200 secondes
- **THEN** la colonne affiche 1 h 1 min 1,2 s, le cumul affiche 5 min 0 s et le dernier cycle 3 min 20 s.
