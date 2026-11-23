# publication-cycle Specification

## Purpose

Séparer les statistiques du travail du journal opérationnel de publication et de clôture, avec chronologie PostgreSQL et vues Electric.

## Requirements

### Requirement: Cycle Publication versionné à12 étapes
CAB MUST créer les nouveaux cycles avec Initialisation/Prévol fusionnés, Analyse, Cadrage, Spécification, Versionning, Implémentation, Vérifications, Revue, Archivage, Statistiques, Publication puis Clôture. CAB MUST préserver la définition des anciens RUN.

#### Scenario: Nouvelle session et session historique
- **WHEN** un nouveau RUN est créé après activation
- **THEN** son cycle utilise Publication11 et Clôture12 ; les numéros historiques ne sont pas réinterprétés.

### Requirement: Statistiques gelées avant publication
CAB MUST inclure l'archivage dans les mesures puis figer les statistiques avant les commits, envois, générations et publications d'artefacts. CAB MUST conserver les reçus et durées opérationnels sans les ajouter aux statistiques gelées.

#### Scenario: Build et publication après archivage
- **WHEN** les mesures sont figées à l'étape10
- **THEN** les opérations des étapes11 et12 ne modifient pas leurs valeurs, même pendant leur suivi ou une reprise.

### Requirement: Projet immuable pendant Publication et Clôture
CAB MUST figer les fichiers du projet avant Publication. Les constructions MUST utiliser un espace isolé et les artefacts MUST être conservés hors des sources. Publication et Clôture ne MUST réécrire ni versions, ni code, ni spécifications, ni rapports. Une correction de source MUST revenir à l'étape de travail appropriée puis être qualifiée avant une nouvelle publication.

#### Scenario: Remédiation nécessitant une correction
- **WHEN** un build échoue et une modification de source est nécessaire
- **THEN** une nouvelle itération de travail est ouverte avant écriture ; les reçus et durées précédents sont conservés, et le temps de publication reste hors des mesures de travail.

### Requirement: Chronologie persistante avec sous-étapes et itérations
PG MUST conserver chaque passage d'étape ou sous-étape avec son début, sa fin et sa durée observés. Une réitération MUST créer un nouveau passage ; la durée cumulée et le nombre d'itérations MUST être calculés sur ces passages. Chaque cycle complet1→12 MUST posséder sa propre durée.

#### Scenario: Deux tentatives de construction
- **WHEN** une construction échoue puis réussit après reprise
- **THEN** les deux passages sont conservés, avec leurs états, horodatages et durées, et leur cumul est actualisé.

### Requirement: Vues temps réel sans données inventées
La vue session et son Overview MUST utiliser les données PG diffusées par Electric. Une étape cliquable MUST afficher ses détails, sous-étapes et itérations. Sans donnée mémorisée, la vue MUST rester vide et ne MUST pas produire de date, durée ou statut fictif.

#### Scenario: Consultation d'une étape historique sans données
- **WHEN** aucune donnée temporelle n'a été enregistrée
- **THEN** aucun détail temporel fictif n'est affiché.

### Requirement: Identité de l'artefact publié et installé
Une livraison Debian demandant une preuve de paquet MUST porter l’empreinte du paquet effectivement publié. CAB MUST conserver séparément les preuves Git. Une correction de preuve MUST vérifier les assets distants et préserver les anciennes preuves.

#### Scenario: Tag Git et paquet Debian
- **WHEN** leurs empreintes diffèrent
- **THEN** CAB ne les assimile pas ; la preuve du paquet est établie sur les octets vérifiés de l’asset.

### Requirement: Commit local propre à la phase Statistiques
Si le parcours du change prévoit un commit, la phase Statistiques MUST committer localement les seuls rapports qu’elle a modifiés. CAB MUST vérifier leurs empreintes et conserver les autres modifications et indexations. Ce commit MUST rester distinct du commit de publication et ne MUST déclencher ni tag ni envoi distant.

#### Scenario: Rapport réécrit et BLOCKERS.md préexistant modifié
- **WHEN** la phase réécrit les deux rapports statistiques et ne modifie pas BLOCKERS.md
- **THEN** son commit contient seulement les deux rapports ; BLOCKERS.md, le code et les fichiers d'autres travaux sont conservés hors de ce commit.

#### Scenario: Change sans commit demandé
- **WHEN** la phase produit ses rapports pour un parcours sans commit
- **THEN** les rapports sont conservés localement et aucune référence Git n'est modifiée par la phase.

#### Scenario: Rapports déjà à jour
- **WHEN** le rapport du change, le rapport global et le fichier BLOCKERS.md ne sont pas modifiés par cette exécution
- **THEN** CAB ne crée aucun commit.

### Requirement: Travail observé et attente par étape
L’Overview MUST séparer le travail attesté du temps d’attente. CAB MUST borner les intervalles au passage d’étape et éviter de compter deux fois les chevauchements. La durée totale du cycle reste une durée écoulée. CAB MUST laisser vide toute durée dont les preuves manquent.

#### Scenario: Initialisation restée ouverte pendant la nuit
- **WHEN** aucun tour ni effet CAB observé ne couvre une partie d’un passage et que la télémétrie couvre cette période
- **THEN** CAB affecte cette partie à l’attente et la distingue du travail.

### Requirement: Horodatages de Revue et Clôture
CAB MUST utiliser les événements observés de demande et décision pour la Revue, et de début et fin pour la Clôture. CAB MUST préserver les traces historiques. Une revue non exigée MUST apparaître comme non requise si CAB ne dispose d’aucun passage.

#### Scenario: Clôture historique avec deux événements
- **WHEN** un RUN clôturé dispose d’un événement de début de finalisation et d’un reçu de clôture
- **THEN** l’Overview présente les dates observées même si aucun passage de Clôture n’a été conservé.

### Requirement: Cycle complet horodaté et suivi par Electric
CAB MUST vérifier les deux bornes de chacune des douze étapes avant de compter un cycle complet. Une étape non requise MUST être enregistrée à l’heure de la décision. Les listes de sessions, les archives et le détail du RUN MUST afficher les étapes du profil réel et se rafraîchir via Electric.

#### Scenario: Revue facultative lors d’un cycle complet
- **WHEN** CAB franchit la Revue car la politique du RUN ne l’exige pas
- **THEN** CAB enregistre la décision à cet instant et compte le passage sans temps de travail.

### Requirement: Relances d’inactivité par rôle
CAB MUST adresser un texte lisible à la session authentifiée du codeur ou de l’orchestrateur qui doit agir. Il MUST conserver le texte et la preuve de remise dans la vue du RUN. En l’absence de transport vérifiable, CAB MUST afficher le rappel dans le RUN et identifier sa remise comme non confirmée.

#### Scenario: Aucune nouvelle après trois rappels
- **WHEN** l’agent reste inactif après trois relances au premier délai
- **THEN** CAB relance une fois au deuxième délai, puis une dernière fois au troisième délai.

#### Scenario: Configuration et reprise d’activité
- **WHEN** l’administrateur ouvre Administration → Agents
- **THEN** il peut modifier chacun des trois délais, initialisés à 5 minutes, 30 minutes et 4 heures.
- **AND** une nouvelle activité réelle remet la cadence au premier délai.

### Requirement: Entrée et validation d’étape par l’agent responsable
Pour les nouveaux RUN, le codeur direct ou l’orchestrateur piloté MUST annoncer en texte chaque début et chaque retour puis enregistrer l’entrée dans CAB. CAB MUST démarrer les tâches prévues à l’entrée. Il MUST accepter la validation de l’agent et l’avancement seulement après la réussite des tâches CAB du passage.

#### Scenario: Tâche de vérification en cours
- **WHEN** l’agent demande à valider l’étape pendant qu’un contrôle attendu est en cours
- **THEN** CAB conserve l’étape ouverte et affiche le retour attendu. Après réussite, l’agent valide sa part et peut avancer.

### Requirement: Réitérations et clôture contrôlées
L’agent responsable MUST pouvoir revenir à une étape antérieure en préservant les effets dont le résultat reste indéterminé. CAB MUST ouvrir une nouvelle tentative et conserver les reçus historiques. La clôture réussie MUST exiger les validations applicables, les résultats CAB réussis et la validation finale de l’agent.

#### Scenario: Retour après un échec connu
- **WHEN** un résultat échoue et l’agent revient à une étape de son choix
- **THEN** CAB distingue les tentatives et exige de nouvelles validations à partir de l’étape choisie.

#### Scenario: Rapport CAB encore attendu à la clôture
- **WHEN** un retour CAB attendu ou une preuve de clôture manque
- **THEN** CAB présente la preuve manquante et conserve le RUN ouvert.

### Requirement: Actions d’étape attestées et horodatées
CAB MUST réutiliser les passages enfants PostgreSQL pour tracer les actions réellement effectuées. Chaque action MUST identifier sa tentative parente, son origine, son état et ses dates observées. L’Overview MUST recevoir les changements via Electric et afficher seulement les actions attestées.

#### Scenario: Contrôle terminé après un retour en arrière
- **WHEN** le résultat d’un contrôle arrive après l’ouverture d’un autre passage
- **THEN** CAB met à jour l’action du passage où ce contrôle a démarré. Un reçu répété ne crée aucun doublon.

#### Scenario: Action facultative absente
- **WHEN** une action du catalogue n’a pas eu lieu sur ce RUN
- **THEN** aucun passage d’action n’est créé et l’Overview ne l’affiche pas.

### Requirement: Validation de la liste des mandats à l’Initialisation
Pour un nouveau RUN, l’agent responsable MUST enregistrer sa validation de la liste exacte des mandats déclarés avant de terminer l’Initialisation. CAB MUST conserver la liste horodatée avec le passage. Cette validation ne MUST modifier aucune autorité ni permission. La mise à jour système de l’hôte MUST rester extérieure à cette liste.

#### Scenario: Confirmation du périmètre de session
- **WHEN** les mandats déclarés pour le change sont SCM et CICDF
- **THEN** CAB attend leur confirmation exacte. L’Overview montre la liste quand l’agent l’a validée.

### Requirement: Deux actions observées pour les rapports statistiques
CAB MUST tracer séparément le calcul et la validation des statistiques du change et des statistiques globales. Chaque action MUST porter ses propres horodatages et son résultat, dans la tentative qui l’a effectuée.

#### Scenario: Échec avant le calcul global
- **WHEN** le traitement du change échoue avant le lancement du global
- **THEN** seul le passage du traitement réalisé apparaît.

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

### Requirement: Action conditionnelle du bilan de blocage
CAB MUST enregistrer une action pour l’écriture constatée de BLOCKERS.md ou la rédaction attestée par l’agent dans le passage courant. Il MAY accepter le nom historique BLOCKER.md. Le chemin et une empreinte MUST être contrôlés dans le change courant. En l’absence de bilan produit, aucune action correspondante MUST être affichée.

#### Scenario: CISM ou CISMP sans bilan de blocage
- **WHEN** le parcours ne produit aucun fichier de bilan
- **THEN** aucune action de bilan n’apparaît dans l’Overview.

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

### Requirement: Horodatages des actions et passages terminés
Un nouveau passage ou une nouvelle action MUST recevoir sa date de début à son ouverture et sa date de fin à sa terminaison connue. Une validation ponctuelle MUST porter l’instant observé aux deux bornes. Les dates historiques manquantes MUST rester non attestées.

#### Scenario: Verrou refusé avant rendu Statistiques
- **WHEN** l’admission au rendu échoue avant tout calcul
- **THEN** CAB termine les actions de préparation et d’admission effectivement réalisées avec leurs dates. Aucun calcul du change ou global n’est créé pour cette tentative.

### Requirement: Mise à jour de l’hôte indépendante du change
Pour les nouveaux RUN, la clôture MUST dépendre des preuves du change et de sa publication. CABU ne MUST pas être un mandat ou une preuve du cycle. Le LLM MUST déclencher la mise à jour séparément avec cab update, qui MUST utiliser cab-update.service. Le LLM MUST annoncer le résultat du reçu système dans la session.

#### Scenario: Livraison CAB avant mise à jour locale
- **WHEN** toutes les validations et preuves de publication sont présentes mais CABU n’a pas démarré
- **THEN** le RUN peut clôturer et être archivé. La mise à jour ne modifie pas son reçu.

#### Scenario: Historique d’activation
- **WHEN** une ancienne étape contient une action émise par la mise à jour de l’hôte
- **THEN** l’Overview des étapes masque l’action CABU et conserve les preuves historiques.

### Requirement: Bloc Session multionglet
Le bloc MUST garder le titre « Session | Change » de style forge, avec icône, barre verticale et trait horizontal, sous les onglets.

#### Scenario: Consulter les tâches du change
- **WHEN** Change est ouvert
- **THEN** toutes les tâches et leurs états sont visibles.

#### Scenario: Consulter un autre onglet pendant une mise à jour PostgreSQL
- **WHEN** Electric signale une évolution
- **THEN** les onglets restent à jour et les étapes restent cliquables.

### Requirement: Unités des durées affichées
Une durée supérieure à 60 secondes MUST s’afficher en minutes et secondes. Une durée supérieure à 60 minutes MUST s’afficher en heures, minutes et secondes. Le formatage MUST préserver la décimale utile et ne MUST pas modifier la valeur enregistrée.

#### Scenario: Durée d’itération longue
- **WHEN** une itération dure 641,2 secondes
- **THEN** elle s’affiche comme 10 min 41,2 s.

### Requirement: Informations et finalisation visibles
Les onglets MUST présenter les données utiles directement.

#### Scenario: Ouvrir Informations
- **WHEN** Informations est ouvert
- **THEN** aucune ligne Phase, aucun doublon du titre ni badge d’état introductif ne s’affiche.

#### Scenario: Afficher les preuves
- **WHEN** Finalisation est ouverte
- **THEN** les preuves affichables sont toutes visibles sans accordéon.

### Requirement: Sous-onglets du cycle
Le bloc MUST séparer le résumé des détails du cycle réel.

#### Scenario: Parcourir les étapes du cycle
- **WHEN** Étapes du cycle est sélectionné
- **THEN** Résumé conserve la liste et les durées et précède les onglets 1 à 12 du cycle de publication.

#### Scenario: Ouvrir le détail
- **WHEN** un numéro est activé dans le résumé
- **THEN** son onglet affiche directement les détails, itérations et actions.

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

### Requirement: Informations de session en lignes de bloc forge
Le corps de l’onglet Informations MUST utiliser une ligne par information avec un libellé à gauche et sa valeur à droite. Le détail du RUN MUST fournir la synthèse persistée. L’indisponibilité du détail des étapes MUST laisser visibles les compteurs enregistrés.

#### Scenario: Détail des étapes indisponible
- **WHEN** le détail des étapes échoue et que le RUN contient une synthèse persistée
- **THEN** les lignes du bloc Informations affichent les données persistées et demeurent actualisées par Electric.

### Requirement: Tokens observés du cycle de session

CAB MUST conserver dans une table PostgreSQL les comptes entiers de tokens entrants, sortants, lus dans le cache et écrits dans le cache, associés au projet, au change, à la session et au RUN. Il MUST distinguer le codeur et l’orchestrateur et conserver une mesure native une seule fois.

#### Scenario: Cumul par rôle

- **WHEN** une mesure native est attribuable à une action d’une étape du cycle
- **THEN** elle contribue au cumul de cette action, de son étape, de l’itération, de la session et du change, sous le même rôle
- **AND** la répétition de la collecte ne modifie pas les cumuls

#### Scenario: Mesure absente ou attribution partielle

- **WHEN** le compteur natif manque ou son attribution à une action est ambiguë
- **THEN** CAB laisse le compteur indisponible à la granularité non mesurée et conserve la contribution aux niveaux attestés

#### Scenario: Relecture d’une mesure historique

- **WHEN** CAB relit une source native déjà persistée
- **THEN** la mesure conserve son identité et ses cumuls ne sont comptés qu’une fois
- **AND** Tw reste indisponible lorsque la valeur native est absente

#### Scenario: Actualisation des compteurs

- **WHEN** une mesure observée est persistée
- **THEN** les tableaux concernés et Résumé se mettent à jour via Electric
- **AND** Résumé expose la durée et les quatre compteurs du dernier cycle et le cumul de tous les cycles
- **AND** les tableaux utilisent Te, Ts, Tr et Tw et ajoutent les quatre compteurs de l’orchestrateur en mode piloté
- **AND** la présentation emploie K, M ou B selon le seuil et au plus deux décimales

### Requirement: Ajout tracé de mandats à un RUN actif

L’autorité du RUN MUST pouvoir ajouter des mandats explicitement autorisés par le développeur pendant une session active et avant le gel. CAB MUST conserver le cadrage et les validations antérieures, puis journaliser l’ajout, l’autorité et la référence de l’autorisation sur l’étape courante. Les opérations autorisées restent soumises à leurs contrôles propres.

#### Scenario: Ajout après l’initialisation

- **WHEN** le propriétaire direct ou l’orchestrateur désigné ajoute un mandat autorisé à un RUN éligible
- **THEN** le catalogue expose la liste effective et l’étape courante affiche les ajouts
- **AND** une répétition de la même demande restitue le même reçu

#### Scenario: Autorité insuffisante ou CABU

- **WHEN** un autre acteur demande un ajout ou tente d’intégrer CABU au cycle
- **THEN** CAB refuse la demande sans modifier la liste

### Requirement: Disposition des cumuls du cycle de session

CAB MUST afficher le cumul des tokens entrants, sortants, lus dans le cache et écrits dans le cache dans le même encadré que les durées de chaque étape. Résumé MUST afficher le libellé « Totale de tous les cycles » en gras, la durée et les quatre cumuls sur une même ligne logique. Résumé MUST omettre la ligne « Total de la session ».

#### Scenario: Encadré d’étape sur ordinateur et mobile

- **WHEN** le détail d’une étape observée est affiché
- **THEN** les tokens cumulés de l’étape s’affichent à droite des durées si la largeur disponible le permet
- **AND** sur écran étroit ils s’affichent sous les durées dans le même encadré

#### Scenario: Informations et détail des étapes indisponible

- **WHEN** une session est ouverte dans Informations
- **THEN** les lignes « Tokens Entrant total des cycles », « Tokens Sortant total des cycles », « Tokens lus dans le cache total des cycles » et « Tokens écrits dans le cache total des cycles » suivent la durée totale d’attente
- **AND** elles exploitent la synthèse du RUN actualisée par Electric même si le détail des étapes est indisponible
- **AND** les contributions des deux rôles sont identifiables en session pilotée
