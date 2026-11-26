## MODIFIED Requirements

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
