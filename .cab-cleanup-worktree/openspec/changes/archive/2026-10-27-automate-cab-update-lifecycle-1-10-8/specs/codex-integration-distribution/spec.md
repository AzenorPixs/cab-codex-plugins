## MODIFIED Requirements

### Requirement: Commandes CAB canoniques et alias compatibles
`/CAB` MUST être défini dans `.codex/commands/CAB.md`. L'alias `cab.md` MUST
charger le fichier frère CAB.md de même version et transmettre les arguments
inchangés. `CABU.md` MUST charger le fichier frère, refuser tout argument et
exécuter `/CAB update` jusqu'au rapport terminal sans dupliquer la procédure.
La procédure MUST rester dans CAB.md et le skill `approval-bridge`; le plugin
MUST distribuer sa référence `component-update.md`. Toute dépendance absente ou
divergente MUST arrêter l'alias avant effet.

#### Scenario: Mise à jour par raccourci
- **WHEN** `/CABU` est invoqué sans argument avec CAB.md et le plugin de même
  version
- **THEN** CABU charge CAB.md, lequel applique la procédure du skill embarqué,
  et déclenche le même processus d'update sans logique dupliquée

#### Scenario: Alias de compatibilité
- **WHEN** `/cab status --run A` est invoqué
- **THEN** CAB reçoit exactement `status --run A` et produit la consultation ponctuelle

#### Scenario: Arguments ou dépendance invalides
- **WHEN** CABU reçoit un argument ou CAB.md manque ou possède une version divergente
- **THEN** l'alias signale l'erreur et termine avant toute opération réseau ou de maintenance

#### Scenario: Dépendance skill absente ou divergente
- **WHEN** le skill, sa référence de maintenance, ou CAB.md ne correspond pas
  au manifeste installé
- **THEN** l'update s'arrête avant maintenance et indique la dépendance
  manquante ou divergente

### Requirement: Source locale ou Git de la marketplace CAB
La source publiée par défaut MUST rester le dépôt Git CAB sur `main`, sparse
`.agents/plugins` et `plugins`. Si une mise à jour locale explicitement demandée
utilise un paquet plus récent que GitHub, `/CAB update` MUST installer ce paquet
avec le gestionnaire Codex et conserver sa marketplace locale. Il MUST NOT
revenir à une publication plus ancienne. Le retour au dépôt Git MAY avoir lieu
quand GitHub atteint la version locale. Les caches de plugin MUST NOT être
modifiés à la main.

#### Scenario: Migration locale vers GitHub
- **WHEN** la version publiée est au moins celle du paquet local et une
  marketplace locale homonyme est configurée
- **THEN** `/CAB update` remplace la source par GitHub, branche `main`, et
  restaure la racine locale mémorisée si l'ajout Git échoue

#### Scenario: Paquet local plus récent que GitHub
- **WHEN** une mise à jour locale est explicitement demandée et GitHub publie
  une version antérieure au paquet source
- **THEN** le plugin est installé par le gestionnaire Codex depuis la source
  locale, la marketplace locale est conservée et les caches ne sont pas édités
  manuellement

### Requirement: Préservation des ressources pendant la mise à jour CAB
Un échec de préparation réseau, source ou version MUST préserver les installations
et processus. `/CAB update` MUST arrêter systématiquement les trois unités
systemd CAB, installer les quatre briques en remplaçant leurs fichiers, puis
démarrer systématiquement les trois unités sans consulter les états CAB en
précondition. L'indisponibilité de l'API OpenCode MUST NOT bloquer le
remplacement des fichiers broker ni le redémarrage des unités. Configurations
et sources des projets pilotés MUST rester inchangées ; les seules exceptions
de configuration MUST rester la migration réversible de marketplace et les
unités dédiées.

#### Scenario: Préservation des ressources pendant la mise à jour CAB
- **WHEN** la préparation du paquet ou du jeu de commandes échoue
- **THEN** les fichiers et unités restent inchangés et l'échec est rapporté

#### Scenario: Jeu déjà installé
- **WHEN** le paquet validé est identique aux fichiers déployés
- **THEN** les trois unités sont tout de même arrêtées puis redémarrées et le
  rapport distingue les versions installées et actives
