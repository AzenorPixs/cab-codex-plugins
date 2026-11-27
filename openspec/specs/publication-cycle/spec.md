# publication-cycle Specification

## Purpose

Séparer les statistiques du travail du journal opérationnel de publication et de clôture, avec chronologie PostgreSQL et vues Electric.

## Requirements

### Requirement: Cycle Publication versionné à12 étapes
CAB MUST créer les nouveaux cycles avec Initialisation/Prévol fusionnés, Analyse, Cadrage, Spécification, Versionning, Implémentation, Vérifications, Revue, Archivage, Vacante, Publication puis Clôture. CAB MUST conserver le profil et les numéros des anciens RUN.

#### Scenario: Nouvelle session et session historique
- **WHEN** un nouveau RUN est créé après activation
- **THEN** son étape 10 est vacante, sa Publication est à l’étape 11 et sa Clôture à l’étape 12. Les passages historiques gardent leurs numéros et libellés du profil enregistré.

### Requirement: Statistiques gelées avant publication
Pour les RUN du profil précédent, CAB MUST inclure l’archivage dans les mesures puis figer les statistiques avant les commits, envois, générations et publications d’artefacts. CAB MUST conserver les reçus et durées opérationnels hors des statistiques gelées du profil précédent. Pour les nouveaux RUN, la Publication fige les sources et la collecte native continue jusqu’à la fin attestée du travail.

#### Scenario: Build et publication après archivage
- **WHEN** les mesures d’un RUN du profil précédent sont figées à l’étape 10
- **THEN** les opérations des étapes 11 et 12 ne modifient pas leurs valeurs, même pendant leur suivi ou une reprise.

### Requirement: Projet immuable pendant Publication et Clôture
CAB MUST figer les sources avant publication. Les constructions MUST utiliser un espace isolé et les artefacts MUST être conservés hors des sources. Publication et Clôture MUST préserver le code et les spécifications. Pour le nouveau profil, la Clôture peut écrire localement les rapports statistiques. Une correction de source MUST revenir à l’étape de travail appropriée puis être qualifiée avant une nouvelle publication.

#### Scenario: Remédiation nécessitant une correction
- **WHEN** un build échoue et une modification de source est nécessaire
- **THEN** une nouvelle itération de travail est ouverte avant écriture et les reçus et durées précédents sont conservés.

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
Pour les RUN du profil précédent dont le parcours prévoit un commit, la phase Statistiques MUST committer localement les seuls rapports qu’elle modifie. CAB MUST vérifier leurs empreintes et conserver les autres modifications et indexations. Ce commit reste distinct du commit de publication et ne déclenche ni tag ni envoi distant. Le nouveau profil fait l’objet de la règle de statistiques en Clôture.

#### Scenario: Rapport réécrit et BLOCKERS.md préexistant modifié
- **WHEN** la phase du profil précédent réécrit les deux rapports statistiques alors qu’un `BLOCKERS.md` préexistant a été modifié par ailleurs
- **THEN** son commit contient seulement les deux rapports et conserve les autres modifications et indexations.

#### Scenario: Change sans commit demandé
- **WHEN** la phase du profil précédent produit ses rapports pour un parcours sans commit
- **THEN** les rapports sont conservés localement et la phase préserve les références Git.

#### Scenario: Rapports déjà à jour
- **WHEN** la phase du profil précédent ne modifie aucun rapport
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
La clôture du RUN MUST dépendre des preuves du change et de la publication. CABU MUST rester indépendant du cycle. Le système MUST conserver la version et l’autorité du mandat explicite de mise à jour. Après la clôture et l’archivage, il MUST transmettre une demande idempotente à cab-update.service pour le paquet attesté. L’appel explicite cab update reste disponible.

#### Scenario: Livraison CAB avant mise à jour locale
- **WHEN** toutes les validations et preuves de publication sont présentes mais CABU n’a pas démarré
- **THEN** le RUN peut clôturer et être archivé. La mise à jour ne modifie pas son reçu.

#### Scenario: Historique d’activation
- **WHEN** une ancienne étape contient une action émise par la mise à jour de l’hôte
- **THEN** l’Overview des étapes masque l’action CABU et conserve les preuves historiques.

#### Scenario: Mise à jour automatique explicitement autorisée

- **WHEN** une livraison directe de CAB porte `post_close_cabu=true` et une preuve de publication du paquet, et que le RUN est clôturé
- **THEN** CAB archive la session si nécessaire puis crée une seule demande système, attachée au SHA-256 du paquet attesté
- **AND** un reçu déjà présent est conservé après redémarrage
- **AND** une divergence du paquet interdit son installation
- **AND** en l’absence du mandat ou des preuves le service ne demande aucune installation

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
- **THEN** la colonne affiche 1 h 1 m 1,2 s dans un onglet d’étape, le cumul affiche 5 min 0 s et le dernier cycle 3 min 20 s.

#### Scenario: Unités des douze onglets d’étape

- **WHEN** une durée est affichée dans un sous-onglet d’étape
- **THEN** ses unités sont `h`, `m` et `s` selon les seuils communs
- **AND** Résumé et les autres vues conservent le format commun

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

### Requirement: Statistiques en dernières actions de Clôture
CAB MUST utiliser pour les nouveaux RUN un profil à douze étapes où l’étape 10 reste vacante. CAB MUST horodater son ouverture et sa validation vide. La Publication reste à l’étape 11 et « Clôture » à l’étape 12. CAB MUST conserver le profil des RUN existants.

#### Scenario: Passage vacant
- **WHEN** l’agent ouvre et valide l’étape 10 du nouveau profil
- **THEN** CAB conserve ses deux bornes et n’exécute aucune tâche à cette étape.

#### Scenario: Dernier tour de codage
- **WHEN** les preuves de publication et la validation finale applicable sont acquises
- **THEN** CAB attend la fin native attestée du travail de chaque rôle applicable, collecte les durées et les tokens disponibles à cette borne, puis écrit le rapport du change et le rapport global, dans cet ordre.
- **AND** le reçu de fermeture du RUN intervient après ces dernières actions, sans commit, tag ni envoi distant de clôture.

#### Scenario: Télémétrie tardive
- **WHEN** le dernier tour est encore actif ou sa borne manque
- **THEN** CAB attend la preuve de fin et conserve le RUN ouvert.

#### Scenario: Tour de clôture suivi d’un nouveau tour
- **WHEN** le journal natif vérifié atteste la fin du tour portant la validation finale d’un RUN direct
- **THEN** CAB collecte la télémétrie jusqu’à cette fin, même si un tour ultérieur est ouvert
- **AND** les entrées de compaction sans télémétrie ne bloquent pas la lecture des bornes et des compteurs.

### Requirement: Rapports admissibles inclus dans la Publication
Pour un RUN du nouveau profil, CAB MUST intégrer dans le snapshot Git de toute publication autorisée les fichiers `STATISTICS.md` et `BLOCKERS.md` admissibles du projet, quelle que soit leur provenance, leur date, leur quantité ou le mandat de publication. CAB MUST vérifier la cohérence des contenus et des index entre admission et commit. Le commit de publication les propage aux forges configurées.

#### Scenario: Rapports différés sur plusieurs RUN
- **WHEN** une publication est autorisée avec des rapports du projet en attente issus de plusieurs sessions et archives
- **THEN** les rapports admissibles entrent dans le commit et ses envois aux forges pour les périmètres change et projet.

#### Scenario: Modification concurrente
- **WHEN** un rapport sélectionné change après le snapshot de publication
- **THEN** CAB refuse le commit de ce snapshot divergent avant de modifier les références.

### Requirement: Tableau compact des passages par étape

Dans les douze onglets, CAB MUST garder une ligne par passage. Cycle, Début, Fin, CAB, Agents et Attentes MUST utiliser des gabarits fixes. Les colonnes de tokens MUST partager une largeur suffisante pour `99 999,99 M`. État MUST recevoir la largeur restante. Le défilement horizontal MUST rester limité au tableau.

#### Scenario: Colonnes dans les douze onglets

- **WHEN** un onglet d’étape affiche ses passages
- **THEN** le tableau affiche Cycle, Début, Fin, CAB, Agents et Attentes, puis Te, Ts, Tr, Tw, puis CTe, CTs, CTr et CTw pour chaque rôle applicable, puis État
- **AND** les colonnes CTe, CTs, CTr et CTw affichent les coûts fournis pour le passage et restent vides quand ces coûts sont indisponibles
- **AND** le texte complet d’une valeur dépassant sa colonne reste consultable dans son infobulle

#### Scenario: Largeurs fixes des colonnes de passage

- **WHEN** un onglet affiche le tableau Cycle
- **THEN** Cycle est dimensionné sur son titre suivi de deux espaces
- **AND** Début et Fin sont dimensionnés sur une date complète avec heures, minutes et secondes suivie de trois espaces
- **AND** CAB, Agents et Attentes sont dimensionnés sur le même gabarit `9999,9 s` suivi de quatre espaces

#### Scenario: Compteurs de tailles différentes

- **WHEN** les compteurs ont des contenus de tailles différentes
- **THEN** les huit colonnes de chaque rôle partagent la largeur de `99 999,99 M` suivi de trois espaces ordinaires
- **AND** toute valeur dont le format dépassera cette largeur reste consultable en entier dans son infobulle

#### Scenario: Espace disponible pour une ligne complète

- **WHEN** la largeur disponible suffit à afficher toutes les colonnes
- **THEN** État reçoit la largeur restante et le tableau n’a pas de défilement horizontal
- **AND** lorsque la largeur devient insuffisante, le tableau défile horizontalement sans faire déborder la page

#### Scenario: Passage en cours

- **WHEN** un passage est en cours
- **THEN** une icône rotative accompagne le libellé « En cours » dans la colonne État
- **AND** l’icône reste fixe si la préférence de réduction des animations est activée

#### Scenario: Passage annulé

- **WHEN** un passage est annulé
- **THEN** un triangle jaune avec un point d’exclamation accompagne le libellé « Annulé » dans la colonne État

#### Scenario: Passage terminé

- **WHEN** un passage est terminé
- **THEN** une coche verte accompagne le libellé « Terminé » dans la colonne État

#### Scenario: Passage non exécuté

- **WHEN** un passage porte l’état « Non exécuté »
- **THEN** un cercle gris avec un tiret accompagne son libellé dans la colonne État

#### Scenario: Aligner Cycle et Actions

- **WHEN** un sous-onglet d’étape affiche Cycle et un tableau Actions
- **THEN** les zones de ces tableaux partagent les mêmes bords gauche et droit
- **AND** les en-têtes et cellules d’Actions adoptent la typographie de Cycle

### Requirement: Réconciliation autonome d’une admission de publication incertaine

CAB MUST conserver le prévol et le reçu original d’une admission incertaine. Il MUST vérifier l’identité du RUN, la version, la portée et la révision. Toute reprise conserve ces paramètres et reçoit sa propre référence. La reprise est unique sauf pour un interblocage PostgreSQL identifié, qui autorise jusqu’à trois reprises avec délais croissants.

#### Scenario: Livraison déjà créée

- **WHEN** le résultat de l’admission est incertain et qu’un reçu durable correspond au même RUN, à la version, à la portée et à la révision
- **THEN** CAB rattache ce reçu et suit son état sans créer de deuxième livraison

#### Scenario: Admission interrompue sans effet

- **WHEN** l’exécution de l’admission est terminée ou son worker est prouvé arrêté, aucun effet Git ou de construction et publication n’est détecté, et le prévol avant et après l’incident concorde pour les sources, les index, les références locales et distantes et la configuration de livraison
- **THEN** CAB conserve le reçu `UNKNOWN`, enregistre la preuve `FAILED_NO_EFFECTS` et admet une nouvelle tentative pour la même version et la même portée dans la limite applicable

#### Scenario: Preuve incomplète ou effet possible

- **WHEN** le prévol est absent ou divergent, un effet concurrent est possible ou le nombre maximal de reprises a été atteint et aucun reçu compatible n’est disponible
- **THEN** CAB conserve l’incertitude et sa protection

#### Scenario: Interblocage de l’admission

- **WHEN** PostgreSQL signale un interblocage `40P01` et que le contrôle d’absence d’effet est complet
- **THEN** CAB conserve la preuve et met la reprise suivante en attente d’un délai croissant
- **AND** après trois reprises, une admission encore incertaine reste protégée
- **AND** les mises à jour d’état du connecteur gardent un verrou d’écriture compatible avec les contrôles de clés étrangères

### Requirement: Pictogramme de passage indéterminé

Dans les tableaux des douze onglets d’étape, CAB MUST accompagner le libellé « Indéterminé » d’un point d’interrogation dans un rond bleu.

#### Scenario: Passage indéterminé

- **WHEN** un passage est indéterminé
- **THEN** le pictogramme et le libellé restent visibles dans la cellule État sur une ligne

### Requirement: Dernier cycle dans le titre de chaque étape

Dans chaque onglet d’étape du détail de session, CAB MUST afficher le pictogramme du dernier passage immédiatement après le titre de l’étape. Sa taille MUST suivre celle du titre. À sa suite, « Dernier Cycle de cette étape » MUST présenter la durée et les quatre mesures de tokens de ce passage pour chaque rôle applicable.

#### Scenario: Dernier passage disponible

- **WHEN** l’étape possède plusieurs passages chronologiques
- **THEN** le pictogramme et les valeurs proviennent exclusivement du dernier passage observé de cette étape
- **AND** la durée est suivie de Token/Entrant, Token/Sortant, Tokens lus dans le cache et Tokens écrits dans le cache pour le ou les rôles applicables
- **AND** une mesure indisponible affiche un tiret

#### Scenario: Aucun passage disponible

- **WHEN** l’étape n’a aucun passage observé
- **THEN** son titre reste seul sans résumé du dernier cycle

### Requirement: Coûts du dernier passage dans le bloc des étapes

Dans les douze onglets d’étape, le bloc avant Cycle MUST présenter les durées, les compteurs de tokens et les coûts en trois colonnes équilibrées lorsque la largeur le permet. Une séparation verticale MUST délimiter chaque groupe de tokens et de coûts. Chaque ligne « Coût » MUST reprendre la valeur de la cellule de coût correspondante du dernier passage de l’étape, par type de token et par rôle.

#### Scenario: Plusieurs passages et coûts distincts

- **WHEN** le tableau contient un coût pour un type de token du dernier passage
- **THEN** la même valeur figure sur sa ligne Coût, y compris si elle vaut zéro
- **AND** les coûts éventuels des passages précédents ne contribuent pas à ce bloc

#### Scenario: Coût indisponible

- **WHEN** la cellule correspondante du dernier passage est vide ou que le passage est absent
- **THEN** le bloc affiche un tiret pour ce coût

#### Scenario: Écran étroit

- **WHEN** les trois colonnes ne tiennent plus dans le bloc
- **THEN** elles sont empilées avec une séparation horizontale et restent accessibles

### Requirement: Agents observés des passages d’étape

CAB MUST conserver dans PostgreSQL, dans `sessions_agents`, les modèles et niveaux de raisonnement observés pour les passages et rôles applicables. CAB MUST résoudre le fournisseur depuis le catalogue des modèles et fournisseurs lorsque le rapprochement est univoque. Le détail du RUN MUST afficher Agents directement sous Cycle dans le même espace de défilement.

#### Scenario: Observer le rôle et les réglages

- **WHEN** un modèle est observé pendant un tour qui recoupe un passage
- **THEN** CAB conserve le modèle, le raisonnement disponible et le type « Codage » ou « Orchestrateur » établi dans le RUN
- **AND** une nouvelle collecte des mêmes réglages ne duplique pas la ligne
- **AND** un fournisseur ambigu ou un raisonnement absent demeure indisponible

#### Scenario: Aligner Agents sous Cycle

- **WHEN** le tableau Cycle d’un onglet d’étape est affiché
- **THEN** Agents suit immédiatement Cycle, avec les mêmes trois premières colonnes et les mêmes largeurs
- **AND** Type est dimensionné pour « Orchestrateur » suivi de deux espaces et Fournisseurs précède les quatre coûts
- **AND** les quatre coûts suivent les bords et largeurs du groupe de coûts le plus à droite de Cycle
- **AND** Raisonnement précède Agents, dont le nom de modèle occupe le reste sans retour à la ligne
- **AND** un tarif par type indisponible reste vide

#### Scenario: Tarif par identifiant observé

- **WHEN** CAB dispose de l’identifiant natif du modèle d’un codeur ou d’un orchestrateur
- **THEN** le tableau Agents affiche les tarifs d’entrée, de sortie, de lecture et d’écriture du cache, en dollars par million de tokens, depuis l’entrée exacte de ce fournisseur dans le catalogue
- **AND** un tarif nul s’affiche avec sa valeur zéro
- **AND** une correspondance ambiguë ou incompatible avec le fournisseur observé laisse les tarifs vides
- **AND** les montants de coût observés restent des données distinctes des tarifs du catalogue

### Requirement: Coûts des passages calculés en direct

CAB MUST calculer le montant en dollars par rôle et catégorie du passage à partir des tokens natifs déclarés et du tarif catalogue par million du modèle et du fournisseur applicables. CAB MUST stocker les montants par RUN et passage dans `sessions.token_costs`. Le chargement du tableau Cycle et du bloc de coûts de l’étape MUST lire cette projection persistée. Electric MUST signaler toute mise à jour de cette projection via le RUN. Les montants affichés MUST avoir au plus deux décimales.

#### Scenario: Modèles successifs dans un même passage
- **WHEN** CAB observe plusieurs réglages de modèle successifs pour un rôle dans un passage
- **THEN** le premier segment commence au début exact du passage, chaque changement termine le segment précédent et commence le suivant, et le dernier se termine à la fin exacte du passage
- **AND** un modèle qui revient après un autre reste une ligne distincte
- **AND** le tableau Agents conserve les quatre colonnes tarifaires alignées sur les colonnes de coût du tableau Cycle.

#### Scenario: Montant de plusieurs modèles
- **WHEN** des mesures de tokens appartiennent à différents segments
- **THEN** CAB attribue chaque mesure au segment actif à son horodatage, additionne les montants exacts avant arrondi et actualise la session et la projection Electric
- **AND** une catégorie reste sans montant si des tokens positifs ont un tarif indisponible, tandis que zéro token déclaré produit un montant nul.
