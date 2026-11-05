## ADDED Requirements

### Requirement: Commande CAB unique en majuscules
`/CAB` MUST être la seule commande de pilotage et MUST être définie dans
`.codex/commands/CAB.md`. `/CABU` MUST charger le fichier frère `CAB.md` de
même version, refuser les arguments et exécuter `/CAB update` jusqu’au rapport
terminal. Aucun fichier `cab.md` ni invocation `/cab` ne MUST être distribué
ou reconnu. CABU ne duplique pas la procédure ; une dépendance absente ou
divergente MUST bloquer. La préparation source MUST NOT invoquer les services
actifs.

#### Scenario: Mise à jour par raccourci
- **WHEN** `/CABU` est invoqué sans argument avec `CAB.md` et le plugin de même
  version
- **THEN** CABU charge `CAB.md`, lequel applique la procédure du skill embarqué,
  et déclenche le même processus d’update sans logique dupliquée

#### Scenario: Invocation minuscule absente
- **WHEN** `/cab` est invoqué après la migration des commandes
- **THEN** aucune commande CAB ne s’exécute ; le développeur doit employer `/CAB`

#### Scenario: Arguments ou dépendance invalides
- **WHEN** CABU reçoit un argument ou `CAB.md` manque ou possède une version
  divergente
- **THEN** CABU signale l’erreur et termine avant toute opération réseau ou de
  maintenance

#### Scenario: Dépendance skill absente ou divergente
- **WHEN** le skill, sa référence de maintenance, ou `CAB.md` ne correspond
  pas au manifeste installé
- **THEN** l’update s’arrête avant maintenance et indique la dépendance
  manquante ou divergente

## MODIFIED Requirements

### Requirement: Identités CAB et CABU en majuscules
La marketplace MUST identifier les plugins et leurs skills invocables comme
CAB/CABU et $CAB/$CABU. Les commandes canoniques MUST rester /CAB et /CABU ;
seul /CAB MUST assurer le pilotage. La marketplace MUST s’afficher CAB Codex
Plugins. Les chemins techniques MUST rester compatibles ; l’alias /cab MUST
NOT être reconnu ni distribué. Le skill coding-session-statistics MUST rester
accessible sous CAB.

#### Scenario: Distribution vérifiée
- **WHEN** un paquet est préparé
- **THEN** les entrées marketplace, manifestes et frontmatters annoncent les identifiants majuscules et les sélecteurs CLI utilisent CAB@cab_codex_plugins et CABU@cab_codex_plugins

#### Scenario: Ancien plugin installé
- **WHEN** une installation utilise encore cab-approval-bridge
- **THEN** le gestionnaire installe et vérifie CAB avant retrait de l'ancienne entrée, sans édition manuelle du cache ni modification des données métier

### Requirement: Source et remplacement atomique de la commande de profil CAB
`/CAB update` MUST préparer uniquement CAB.md et CABU.md depuis GitHub/main,
avec une version SemVer identique. Une préparation invalide MUST laisser le
profil intact. La publication MUST sauvegarder les fichiers remplacés et
`cab.md`, installer atomiquement la paire validée, puis retirer `cab.md` ; un
échec MUST restaurer le profil. Les commandes locales plus récentes ou
divergentes à version égale MUST rester intactes. `cab.md` MUST NOT servir de
source canonique ou de référence de version.

#### Scenario: Source et remplacement atomique de la commande de profil CAB
- **WHEN** la commande GitHub possède une version valide strictement plus récente que la copie de profil
- **THEN** la copie est remplacée atomiquement après validation de sa source et de son frontmatter

#### Scenario: Jeu distant incohérent
- **WHEN** l’un des deux fichiers canoniques manque ou porte une version
  divergente
- **THEN** aucune commande locale n’est remplacée et le bilan indique l’échec

#### Scenario: Installation héritée avec alias minuscule
- **WHEN** `CAB.md` ou `CABU.md` est absent et une ancienne copie `cab.md` existe
- **THEN** l’update prépare le jeu canonique depuis GitHub, sauvegarde les
  anciennes copies, installe les deux fichiers validés, puis retire `cab.md`

#### Scenario: Alias absent à version égale
- **WHEN** les deux commandes locales correspondent aux sources distantes et
  `cab.md` est absent
- **THEN** aucun alias n’est recréé et le jeu canonique reste inchangé

#### Scenario: Échec pendant publication
- **WHEN** la publication d’une commande canonique ou le retrait de l’alias
  échoue
- **THEN** les copies remplacées sont restaurées, les seuls nouveaux fichiers
  retirés et l’échec signalé sans succès global
