## MODIFIED Requirements

### Requirement: Identité de l'artefact publié et installé
Une livraison Debian demandant une preuve de paquet MUST porter l’empreinte du paquet effectivement publié. CAB MUST conserver séparément les preuves Git. Une correction de preuve MUST vérifier les assets distants et préserver les anciennes preuves.

#### Scenario: Tag Git et paquet Debian
- **WHEN** leurs empreintes diffèrent
- **THEN** CAB ne les assimile pas ; la preuve du paquet est établie sur les octets vérifiés de l’asset.

### Requirement: Validation de la liste des mandats à l’Initialisation
Pour un nouveau RUN, l’agent responsable MUST enregistrer sa validation de la liste exacte des mandats déclarés avant de terminer l’Initialisation. CAB MUST conserver la liste horodatée avec le passage. Cette validation ne MUST modifier aucune autorité ni permission. La mise à jour système de l’hôte MUST rester extérieure à cette liste.

#### Scenario: Confirmation du périmètre de session
- **WHEN** les mandats déclarés pour le change sont SCM et CICDF
- **THEN** CAB attend leur confirmation exacte. L’Overview montre la liste quand l’agent l’a validée.

### Requirement: Ventilation des durées sans double comptage
L’Overview MUST répartir le temps borné entre CAB, Agent(s) et Attente. CAB MUST recevoir les chevauchements. Le reste sans preuve suffisante de travail MUST être attribué à l’Agent. Les trois colonnes MUST totaliser la durée affichée, après arrondi. L’Overview MUST afficher les valeurs de durée seules.

#### Scenario: Travail simultané
- **WHEN** CAB et un ou plusieurs agents travaillent au même instant
- **THEN** cet instant est attribué à CAB une seule fois.

#### Scenario: Preuve de travail indisponible
- **WHEN** un intervalle borné ne peut pas être attribué d’après les preuves réelles
- **THEN** il est classé dans Agent(s). La provenance reste enregistrée en base et aucun libellé supplémentaire n’est affiché.

#### Scenario: Arrondi des colonnes
- **WHEN** une ventilation est affichée au dixième de seconde
- **THEN** CAB, Agent(s) et Attente totalisent exactement la durée totale affichée.

### Requirement: Projection PostgreSQL des durées de passage et de cycle
CAB MUST conserver les totaux répartis, la part du temps attribuée à l’Agent faute de trace et la référence du calcul par passage et par cycle. Une nouvelle preuve MUST permettre de réviser ces totaux, même pour un RUN archivé. Electric MUST actualiser les vues suite aux mises à jour.

#### Scenario: Ventilation partielle du RUN 218
- **WHEN** une tentative Statistiques bornée reste sans preuve précise de travail
- **THEN** CAB conserve l’attente observée et attribue le reste à l’Agent.

#### Scenario: Travail observé pendant un passage en cours
- **WHEN** un retour mesuré est disponible avant la fin du passage
- **THEN** CAB enregistre et affiche les totaux jusqu’aux dernières bornes observées via Electric. La date de fin reste vide jusqu’à la terminaison du passage.

#### Scenario: Terminaison affichée en direct
- **WHEN** une étape se termine
- **THEN** CAB persiste ses trois durées et sa date de fin ensemble. L’événement Electric n’affiche aucun passage terminé avec des totaux en attente du recalcul périodique.

#### Scenario: Preuve tardive
- **WHEN** une preuve fournit les bornes d’un travail précédemment attribué à l’Agent faute de trace
- **THEN** CAB réattribue sa durée au responsable et actualise la projection sans modifier le reçu initial.

## ADDED Requirements

### Requirement: Mise à jour de l’hôte indépendante du change
Pour les nouveaux RUN, la clôture MUST dépendre des preuves du change et de sa publication. CABU ne MUST pas être un mandat ou une preuve du cycle. Le LLM MUST déclencher la mise à jour séparément avec cab update, qui MUST utiliser cab-update.service. Le LLM MUST annoncer le résultat du reçu système dans la session.

#### Scenario: Livraison CAB avant mise à jour locale
- **WHEN** toutes les validations et preuves de publication sont présentes mais CABU n’a pas démarré
- **THEN** le RUN peut clôturer et être archivé. La mise à jour ne modifie pas son reçu.

#### Scenario: Historique d’activation
- **WHEN** une ancienne étape contient une action émise par la mise à jour de l’hôte
- **THEN** l’Overview des étapes masque l’action CABU et conserve les preuves historiques.
