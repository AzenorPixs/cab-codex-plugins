## MODIFIED Requirements

### Requirement: Ventilation des durées sans double comptage
L’Overview MUST répartir le temps borné entre CAB, Agent(s) et Attente. CAB MUST recevoir les chevauchements. Le temps restant sans preuve suffisante de travail MUST être attribué à l’attente par convention et distingué de l’attente observée. Les trois colonnes MUST totaliser la durée affichée, après arrondi.

#### Scenario: Travail simultané
- **WHEN** CAB et un ou plusieurs agents travaillent au même instant
- **THEN** cet instant est attribué à CAB une seule fois.

#### Scenario: Preuve de travail indisponible
- **WHEN** un intervalle borné ne peut pas être attribué d’après les preuves réelles
- **THEN** il est classé en Attente par convention. L’Overview préserve le détail du montant attribué.

#### Scenario: Arrondi des colonnes
- **WHEN** une ventilation est affichée au dixième de seconde
- **THEN** CAB, Agent(s) et Attente totalisent exactement la durée totale affichée.

### Requirement: Projection PostgreSQL des durées de passage et de cycle
CAB MUST conserver les totaux répartis, la part d’attente attribuée par convention et la référence du calcul par passage et par cycle. Une nouvelle preuve MUST permettre de réviser ces totaux, même pour un RUN archivé. Electric MUST actualiser les vues suite aux mises à jour.

#### Scenario: Ventilation partielle du RUN 218
- **WHEN** une tentative Statistiques bornée reste sans preuve précise de travail
- **THEN** CAB additionne l’attente observée et l’attente par convention et conserve leur distinction.

#### Scenario: Travail observé pendant un passage en cours
- **WHEN** un retour mesuré est disponible avant la fin du passage
- **THEN** CAB enregistre et affiche les totaux jusqu’aux dernières bornes observées via Electric. La date de fin reste vide jusqu’à la terminaison du passage.

#### Scenario: Terminaison affichée en direct
- **WHEN** une étape se termine
- **THEN** CAB persiste ses trois durées et sa date de fin ensemble. L’événement Electric n’affiche aucun passage terminé avec des totaux en attente du recalcul périodique.

#### Scenario: Preuve tardive
- **WHEN** une preuve fournit les bornes d’un travail précédemment attribué à l’attente par convention
- **THEN** CAB réattribue sa durée au responsable et actualise la projection sans modifier le reçu initial.
