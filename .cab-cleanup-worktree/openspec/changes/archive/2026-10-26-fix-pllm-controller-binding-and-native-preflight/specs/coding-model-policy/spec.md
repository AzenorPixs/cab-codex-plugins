## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Catalogue public configurable et compatibilité
CAB MUST accepter OC_Codex_PLLM_CATALOG absolu, avec l'alias OC_CGPT_PLLM_CATALOG en absence du nom principal, pour le pllm-current.json public du skill actif. La lecture MUST rester bornée sans secret ni écriture de catalogue. Les anciens jobs sans négociation MUST rester lisibles. Le protocole 1.10.3 MUST exiger pllm-auto-v1 avant un nouveau job piloté ; la préparation source MUST NOT modifier les agents ou fournisseurs actifs.

#### Scenario: Catalogue manquant ou lien symbolique
- **WHEN** la sélection automatique ne peut lire le catalogue public configuré en sécurité
- **THEN** elle échoue avec diagnostic sans lire de stockage privé ni créer une politique
