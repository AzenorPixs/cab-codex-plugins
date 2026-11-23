# session-requested-effects Specification

## Purpose

Porter dans le moteur CAB la préparation des versions, les effets de session autorisés et la remédiation avant reprise, avec reçus durables et sans commande Git du LLM.

## Requirements

### Requirement: Versions publiques cohérentes avant Git
CAB MUST refuser une livraison CAB avant commit si les versions publiques du paquet diffèrent de la cible. CAB MUST permettre leur préparation sur les seuls fichiers réservés au RUN, conserver l'intention et exiger une nouvelle qualification des sources modifiées.

#### Scenario: Source3.9.3 et livraison3.9.4
- **WHEN** les métadonnées du paquet ne correspondent pas à3.9.4
- **THEN** le prévol refuse avant commit, tag ou envoi ; la préparation aligne uniquement les scalaires de version réservés.

### Requirement: Effet ponctuel ou reprise autorisée
CAB MUST permettre un commit sans nouveau tag, une construction d'artefact ou sa publication sur demande autorisée du développeur, ainsi que leur reprise après un échec connu du parcours. CAB MUST conserver RUN/SID, autorité, périmètre, CAS et reçus de chaque tentative. Un effet UNKNOWN MUST rester protégé contre le rejeu.

#### Scenario: Effet ponctuel en session pilotée
- **WHEN** l'orchestrateur enregistre l'autorisation explicite d'un effet précis
- **THEN** le codeur peut inspecter et demander cet effet ; il ne peut pas s'accorder lui-même cette autorisation.

#### Scenario: Nouvelle tentative après échec connu
- **WHEN** le parcours a enregistré l'échec de l'effet correspondant et le codeur demande une nouvelle tentative identifiée
- **THEN** CAB vérifie l'état courant, conserve le reçu précédent et produit un nouveau reçu sans rejouer une requête connue.

### Requirement: Reprise après commit sur la même livraison
CAB MUST permettre une reprise explicitement autorisée d'une livraison partielle après commit. Un commit supplémentaire MUST utiliser les références observées et leurs leases exactes. CAB MUST conserver les reçus et le plan initiaux et ne pas reprendre une étape inconnue ou concurrente.

#### Scenario: Reprise CICDF de213
- **WHEN** la version, le RUN et la livraison sont conservés, le build a échoué et le périmètre complet est explicitement autorisé puis qualifié
- **THEN** CAB capture ce périmètre, réalise le commit de reprise, poursuit la publication et produit ses preuves courantes avant CABU et clôture.

### Requirement: Remédiation avant nouvelle tentative
CAB MUST diagnostiquer un échec de construction avant sa reprise et identifier les remédiations prises en charge. CAB MUST préparer les corrections de version réservées puis exiger une qualification fraîche. Les diagnostics publiés MUST rester structurés et sans contenu brut des sorties des processus.

#### Scenario: Échec de préparation du paquet Debian
- **WHEN** la préparation échoue à cause de versions désalignées ou d'une dépendance publique indisponible
- **THEN** CAB indique la cause et l'action de remédiation ; une nouvelle tentative attend les sources et prérequis qualifiés.

#### Scenario: Suivi compact et intention interrompue
- **WHEN** le LLM déclare une opération autorisée ou consulte son reçu
- **THEN** CAB capture le CAS, suit les effets et restitue un résultat compact ; un worker arrêté après dispatch laisse une issue UNKNOWN protégée, sans rejeu.
