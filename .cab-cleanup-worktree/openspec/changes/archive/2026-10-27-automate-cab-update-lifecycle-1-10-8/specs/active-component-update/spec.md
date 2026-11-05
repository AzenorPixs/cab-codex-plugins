## MODIFIED Requirements

### Requirement: Mise à jour forcée des services CAB
Le profil ordinaire MUST valider le paquet et préparer ses sauvegardes sans
lire les RUN, permissions, coordinations globales ou états de service pour
décider si la mise à jour peut commencer. Il MUST arrêter systématiquement,
via systemd utilisateur, les unités controller, supervisor et monitor,
remplacer leurs artefacts ainsi que les trois fichiers broker dans la
destination déclarée, recharger systemd et démarrer systématiquement les trois
unités. L'absence d'OpenCode MUST NOT empêcher le remplacement des fichiers
broker ni le démarrage des services CAB. Le profil frozen-recovery-controller
reste distinct et conserve ses contrôles dédiés. Aucun profil MUST décider ou
rejouer une permission ni purger le runtime.

#### Scenario: RUN ou coordination active
- **WHEN** des RUN, permissions ou une coordination globale sont actifs au
  début de `/CAB update`
- **THEN** l'update ne les consulte pas pour décider de poursuivre, arrête les
  trois unités systemd CAB, remplace les artefacts et les redémarre.

#### Scenario: OpenCode absent
- **WHEN** l'API ou le processus OpenCode est absent
- **THEN** l'update remplace tout de même les trois fichiers broker et les
  autres artefacts, démarre les trois unités, puis rapporte le broker runtime
  `INDISPONIBLE` sans bloquer la réussite des autres briques.

#### Scenario: États CAB actifs
- **WHEN** des RUN ou une coordination globale sont actifs avant l'update
- **THEN** l'update les laisse intacts pendant son déroulement et ne les utilise
  pas comme précondition d'arrêt, remplacement ou redémarrage

### Requirement: Déploiement des quatre briques
Le profil ordinaire MUST installer les artefacts du broker, du contrôleur,
du superviseur et du Web. Après toute mise à jour, il MUST démarrer les unités
controller, supervisor et monitor, même si elles étaient inactives avant
l'opération. Il MUST recharger systemd avant leur démarrage et MUST NOT activer
les unités au login. Le profil frozen-recovery-controller MUST conserver ses
contrôles spécifiques.

#### Scenario: Web actif et superviseur inactif
- **WHEN** le profil ordinaire met à jour ces composants
- **THEN** le Web, le contrôleur et le superviseur sont tous actifs sur le
  nouveau jeu sans activation au login

#### Scenario: Redémarrage de toutes les unités CAB
- **WHEN** une mise à jour effective atteint la phase de redémarrage
- **THEN** les trois unités systemd CAB sont démarrées sur le jeu vérifié sans
  appel à `systemctl enable`, quels que soient leurs états avant l'update

#### Scenario: Broker non vérifiable après redémarrage
- **WHEN** OpenCode n'est pas joignable après le redémarrage
- **THEN** les fichiers broker restent mis à jour, leur version sur disque est
  rapportée et la version chargée est `INDISPONIBLE`.

### Requirement: Rapport des versions après redémarrage
Le rapport MUST distinguer les versions des fichiers installés des versions
réellement servies par controller, supervisor et monitor, ainsi que les versions
du plugin, broker et commandes. Il MUST rapporter la version des fichiers broker
même si OpenCode est absent. Si OpenCode n'est pas joignable, la version du broker
chargé MUST être `INDISPONIBLE` et MUST NOT bloquer la réussite des autres
briques. Une source inconnue MUST rester indisponible, sans déduction du plugin.

#### Scenario: Broker de mauvaise version après reconnexion
- **WHEN** la readiness indique une ancienne version du broker
- **THEN** le rapport conserve la version active comme non vérifiée et confirme
  séparément que les fichiers broker ciblés ont été installés

#### Scenario: Redémarrage natif du broker OpenCode
- **WHEN** OpenCode est accessible et le broker CAB est connecté avant l'update
- **THEN** CAB tente `disconnect`, remplace les fichiers, puis tente `connect`
  et rapporte la readiness obtenue sans tuer OpenCode

