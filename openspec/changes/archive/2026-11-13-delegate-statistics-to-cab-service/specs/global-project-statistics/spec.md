## REMOVED Requirements

### Requirement: Brique Statistiques du Web Monitor
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Équivalence des rapports existants
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Moteur distribué indépendant du pilotage
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Extraction traçable et examen des ambiguïtés
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Séparation stricte entre reconstruction et delta
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Rapports de change persistants
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Réutilisation des observations CAB
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Publication récupérable et validation indépendante
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Modes de publication du projet
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Utilisation et interrogation agnostiques
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Requête statistique sans mutation
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Rapport individuel indépendant du global
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Preuves sans fichier partagé
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Rapport historique explicitement identifié
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Suivi initialisé avant les tâches
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Nettoyage des statistiques après rapport durable
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: SGS permanent et autonome
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Retrait ciblé d'instantanés de sessions libérées dans un rapport ouvert
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Retrait explicite du rapport runtime d'un change clos
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Publication statistique en 0770
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

### Requirement: Continuité quantitative native après handoff
**Reason**: Contrat SGS autonome remplacé par le service CAB validé.
**Migration**: Fichiers locaux maîtres, projection et générations gérées par CAB.

## ADDED Requirements

### Requirement: Fichiers locaux statistiques maîtres
Les STATISTICS.md de chaque change MUST rester seuls maîtres, actifs, archivés
ou amendés. CAB MUST préserver texte, tableaux, agents, modèles, coûts, preuves
et révisions ; les mesures absentes ou contradictoires MUST rester explicites.
PG MUST être une projection locale vers base, sans écraser une modification
manuelle par une valeur stockée antérieurement en base.

#### Scenario: Amendement manuel
- **WHEN** un rapport local est amendé
- **THEN** la projection et son historique sont mis à jour depuis ses octets, les valeurs manuelles ne sont pas écrasées silencieusement

### Requirement: Catalogue et synchronisation automatiques
CAB MUST rattacher chaque change à un projet unique, même sans RUN, et conserver
les sources d’archives et amendements. Les éditions locales MUST déclencher une
projection rapide ; un rattrapage aléatoire de toutes les sources MUST survenir
au moins toutes les24heures. Un change ouvert sans codage MUST pouvoir ne pas
avoir de rapport sans être déclaré en erreur.

#### Scenario: Change non commencé
- **WHEN** un change ouvert n’a pas accueilli de session de codage
- **THEN** il est recensé, son rapport n’est pas créé et son absence est normale

### Requirement: Générations CAB et global dérivé
CAB MUST générer ou amender les statistiques après archivage et gérer leur mise
à jour pendant le codage, sans rédaction ni calcul LLM. Le global MUST concaténer
les sources locales disponibles de chaque change et signaler les manquants.
Après inventaire complet, un global absent MUST être généré automatiquement,
avec projection par projet en PG ; aucun registre JSON global n’est requis.

#### Scenario: Global absent
- **WHEN** CAB a inventorié complètement les sources d’un projet
- **THEN** il génère le global depuis les rapports locaux, sans chiffres inventés ni intervention LLM

### Requirement: Protections transactionnelles du service
Les écritures statistiques MUST passer par CAB et des réservations PG durables.
Aucun fichier .STATISTICS.lock MUST être créé. Un effet incertain MUST garder
sa protection jusqu’à vérification ; les publications MUST être atomiques,
vérifier la version locale attendue et respecter les comptes POSIX légitimes.

#### Scenario: Publication incertaine
- **WHEN** une écriture perd sa confirmation ou une source change concurremment
- **THEN** CAB conserve preuves et protection, sans réémettre aveuglément l’écriture ni remplacer une édition locale plus récente

### Requirement: Appelants sans prompt SGS autonome
Les prompts et skills MUST référencer le contrat CAB installé, sans résolution
d’un prompt SGS.md ni production de preuves statistiques par le LLM. Le codeur
MUST garder son autonomie ; seuls exceptions et revue finale sollicitent le parent.

#### Scenario: Session pilotée
- **WHEN** un codeur pilote ses périodes et termine son change
- **THEN** CAB gère rapports et synchronisation sans validation intermédiaire d’orchestrateur, avec reçus vérifiables
