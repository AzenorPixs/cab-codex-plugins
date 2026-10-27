# coding-model-policy Specification

## Purpose
Définir le choix du modèle de codage CAB depuis le prompt ou la PLLM automatique, contrôler high/xhigh et les replis prouvés, puis conserver le choix validé pendant les reprises sans sélection implicite du broker ou du moniteur.

## Requirements

### Requirement: Choix explicite et PLLM automatique
Le protocole CAB MUST conserver le modèle explicitement fixé par le prompt. Sans modèle explicite, il MUST utiliser les politiques PLLM dans leur priorité publiée. Le catalogue MUST être courant, lisible et non ambigu ; une entrée invalide ou non évaluée dans cette invocation MUST NOT être sélectionnée. Une sélection absente MUST bloquer sans modèle inventé.

#### Scenario: Prompt sans modèle
- **WHEN** un nouveau job négocie pllm-auto-v1 sans modèle dans le prompt
- **THEN** CAB résout les candidates actuelles de PLLM dans leur ordre de priorité

#### Scenario: Politique seulement historique
- **WHEN** une politique inférieure n'a pas été évaluée dans la publication active
- **THEN** CAB demande son évaluation actuelle sans utiliser sa réussite historique

### Requirement: Raisonnement high puis xhigh puis politique inférieure
Un raisonnement explicitement donné par le prompt MUST prévaloir. Sinon CAB MUST choisir high si disponible, puis xhigh si high est indisponible, puis la politique de priorité inférieure si les deux sont indisponibles. CAB MUST vérifier les variantes du modèle réel sans déduction depuis son nom. Un échec d'authentification, quota ou réseau MUST NOT être assimilé à une incompatibilité de raisonnement.

#### Scenario: Repli de raisonnement
- **WHEN** une candidate ne déclare que xhigh parmi ces deux variantes
- **THEN** CAB retient xhigh sans imposer low

#### Scenario: Repli de politique
- **WHEN** une candidate automatique ne prend en charge ni high ni xhigh
- **THEN** CAB examine la politique de priorité suivante sans utiliser une entrée historique

#### Scenario: Modèle imposé incompatible
- **WHEN** un modèle explicite ne prend en charge ni high ni xhigh
- **THEN** CAB refuse la sélection sans remplacer silencieusement ce modèle

### Requirement: Prévol exact et reprise du choix conservé
L'armement négocié MUST vérifier un prévol natif réussi sans outils pour le fournisseur, modèle et raisonnement exacts. Il MUST persister la sélection et sa preuve. Le superviseur MUST réutiliser explicitement ces valeurs lors des reprises. Un armement répété MUST NOT modifier le choix d'un job existant. Le broker et le moniteur MUST rester sans sélection LLM ; le validateur Codex MUST conserver son rôle distinct.

#### Scenario: Réponse sur une autre variante
- **WHEN** le prévol correspond au même modèle mais porte low au lieu de high
- **THEN** l'armement refuse cette preuve sans adopter le modèle

#### Scenario: Reprise après redémarrage
- **WHEN** le superviseur reprend un job dont la sélection validée est persistée
- **THEN** il transmet le fournisseur, modèle et raisonnement conservés plutôt que le défaut courant d'OpenCode

### Requirement: Catalogue public configurable et compatibilité
CAB MUST accepter OC_Codex_PLLM_CATALOG absolu, avec l'alias OC_CGPT_PLLM_CATALOG en absence du nom principal, pour le pllm-current.json public du skill actif. La lecture MUST rester bornée sans secret ni écriture de catalogue. Les anciens jobs sans négociation MUST rester lisibles. Le protocole 1.10.5 MUST exiger pllm-auto-v1 avant un nouveau job piloté ; la préparation source MUST NOT modifier les agents ou fournisseurs actifs.

#### Scenario: Catalogue manquant ou lien symbolique
- **WHEN** la sélection automatique ne peut lire le catalogue public configuré en sécurité
- **THEN** elle échoue avec diagnostic sans lire de stockage privé ni créer une politique

### Requirement: Repli après incompatibilité native prouvée
CAB MAY écarter une variante exposée mais rejetée uniquement après preuve native corrélée d'une erreur de paramètre de raisonnement reconnu. La preuve MUST correspondre au modèle, à la variante et à l'évaluation courante. Les erreurs 401, 403, 429, réseau ou paramètres étrangers MUST NOT autoriser ce repli. CAB MUST conserver seulement les références filtrées, sans corps d'erreur brut.

#### Scenario: high puis xhigh refusés par le fournisseur
- **WHEN** deux prévols natifs prouvent successivement le rejet de high et xhigh pour la candidate automatique
- **THEN** CAB examine la politique de priorité inférieure et exige son prévol réussi

#### Scenario: Quota épuisé pendant un prévol
- **WHEN** le fournisseur renvoie 429 plutôt qu'une incompatibilité de raisonnement
- **THEN** CAB ne déclare pas cette variante indisponible et bloque sans repli fondé sur cette erreur

### Requirement: Budget fournisseur imposé par la session de pilotage
La session MUST pouvoir fournir providerMaxBytes dans POST /model-policy/resolve et dans modelSelection à l'armement. CAB MUST accepter un entier sûr strictement positif en octets, l'appliquer au seul /provider de l'appel et refuser les valeurs invalides avant observation. CAB MUST NOT ajouter de plafond fixe à une valeur valide.

#### Scenario: Budget explicite suffisant
- **WHEN** la session fournit un budget suffisant, y compris au-delà de 16 Mio
- **THEN** CAB résout et prévole le modèle avec ce budget sans configuration globale ou changement implicite de modèle

#### Scenario: Budget invalide
- **WHEN** la valeur n'est pas un entier sûr strictement positif
- **THEN** CAB refuse avec diagnostic fixe avant toute observation native

### Requirement: Limite locale et compatibilité des observations
Sans providerMaxBytes, CAB MUST conserver le défaut compatible de 2 Mio. Le budget MUST NOT modifier les limites des autres observations ou du catalogue PLLM, les modèles existants ou les permissions. Un appel MUST NOT hériter du budget d'un autre appel.

#### Scenario: Omission et autre observation
- **WHEN** un nouvel appel omet le budget ou observe une session ou un message
- **THEN** la borne compatible de 2 Mio reste appliquée

### Requirement: Dépassement et confidentialité du fournisseur
CAB MUST interrompre le flux /provider au dépassement du budget avant parsing. Le corps natif MUST NOT être exposé dans les retours, erreurs, journaux ou jobs.

#### Scenario: Flux trop grand
- **WHEN** le flux dépasse le budget choisi par la session
- **THEN** CAB refuse avec un diagnostic fixe sans corps privé

### Requirement: Préparation explicite du catalogue actif
La préparation MUST résoudre le chemin explicite configuré, son alias en absence du principal, puis le catalogue public sous la racine de skill actif fournie. Elle MUST vérifier sa disponibilité et validité sans secret, recherche privée, écriture de publication ou benchmark. En sélection automatique, le démarrage autorisé MUST transmettre le chemin au contrôleur en préservant les autres options et vérifier sa résolution avant nouveau job.

#### Scenario: Catalogue du skill actif et options conservées
- **WHEN** aucun chemin explicite n'est fourni et la racine active contient un catalogue valide
- **THEN** la préparation produit uniquement un patch de configuration non secret, applicable avec les options existantes sans effet runtime implicite

#### Scenario: Configuration explicite invalide
- **WHEN** le chemin explicite est vide, invalide, inaccessible ou ambigu
- **THEN** la préparation refuse sans chercher une autre publication ni afficher de contenu privé

### Requirement: Identités logique et native vérifiées
CAB MUST privilégier le fournisseur exact et MAY rapprocher opencodego vers opencode-go seulement si l'identité logique est absente et le natif unique. Il MUST vérifier connexion, modèle exact et variantes. Il MUST conserver le fournisseur logique dans une nouvelle sélection automatique et utiliser le natif pour prévol et messages. Un fournisseur exact déconnecté ou une ambiguïté MUST refuser, sans changer priorités ou modèle.

#### Scenario: Alias connu et fournisseur natif connecté
- **WHEN** le catalogue sélectionne opencodego et le natif unique connecté opencode-go publie le même modèle
- **THEN** CAB conserve la provenance logique et le digest du catalogue avec une identité native utilisable

#### Scenario: Ambiguïté ou déconnexion
- **WHEN** l'identité est ambiguë ou le fournisseur exact ou natif pertinent est déconnecté
- **THEN** CAB refuse sans normalisation arbitraire, compte de substitution ou sélection manuelle implicite

### Requirement: Variante native ou historique corrélée
Le prévol et l'indisponibilité MUST lire parent.info.model.variant ou parent.info.variant, avec au moins un champ parent valide. Tous les champs parent présents et assistant.info.variant présent MUST être identiques. Une absence, valeur invalide ou contradiction MUST refuser. Les gardes session, répertoire, parent, fournisseur, modèle, date, achèvement et absence d'outil MUST être conservés.

#### Scenario: Prévol natif imbriqué et preuve historique
- **WHEN** la variante parent imbriquée ou historique correspond au choix et aux champs assistant disponibles
- **THEN** CAB peut qualifier la preuve sans modifier les variantes demandées ou les contrats historiques

#### Scenario: Contradiction ou prévol incomplet
- **WHEN** les variantes divergent, manquent ou la réponse est tronquée, en erreur ou contient un outil
- **THEN** CAB refuse la preuve sans permission implicite ni repli spéculatif

#### Scenario: Rejet natif de high puis xhigh
- **WHEN** des erreurs de paramètre reconnues et corrélées prouvent l'indisponibilité des deux variantes
- **THEN** le repli conserve la correspondance fournisseur vérifiée et les gardes de dates, sans considérer auth, quota ou réseau comme preuve
