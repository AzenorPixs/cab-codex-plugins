# Qualification SCM — CAB 1.9.0

Le développeur a validé le complément source/tests support-readonly-broker-reuse,
puis demandé ici le passage mineur 1.8.0 vers 1.9.0. Le périmètre est exclusivement
CAB, ses sources, documentation et bancs isolés. Aucune activation M2/M3 réelle,
décision R0, réparation du prévol consommateur, écriture Pixs, modification de
compte/droits/configuration hôte ou opération Git n'est réalisée ici.

## Résultats exécutés

| Contrôle | Résultat | Preuve locale sous .cab-readonly-work |
| --- | --- | --- |
| Suite Node complète, séquentielle | 371 réussis, 0 échec, 1 ignoré sur 372 | node-serial-final.txt |
| Scénario supplémentaire avant intention | 1/1 réussi, après ajout du seul cas sans changement produit | before-intent-final.txt |
| Node distinct, répétitions exclues | 372 réussis, 0 échec, 1 ignoré sur 373 | Les deux traces ci-dessus |
| Python unittest | 72/72 réussis | python-final.txt |
| Syntaxe | 42 fichiers réussis | source-final.json |
| Deux UID réels | 2 scénarios réussis en 1.9.0 | two-uid-final.txt et two-uid-result.json |
| Navigateurs | Chromium et Firefox réussis | browser-final.txt |
| Copies broker | 3 identiques octet pour octet à src/ | source-final.json |
| Versions des briques | 30 modules source/distribués en 1.9.0 | source-final.json |
| Gardes retry/prévol/ASK/once | 5 corps identiques à l'original 1.7.1 | source-final.json |
| Archives L1/L2 | 20 fichiers conservés à l'identique | source-final.json |

Total unitaire distinct : 444 réussis, aucun échec et un ignoré sur 445 cas.
Les deux scénarios Docker, navigateurs et répétitions ciblées ne sont pas
additionnés à ce total. Le scénario OpenCode produit opt-in est non exécuté ;
le serveur OpenCode des fixtures est simulé et explicitement identifié comme tel.
Les contrôleurs, superviseurs, moniteurs et brokers de ces fixtures sont des
processus réellement exécutés, sans utilisation des services consommateurs.

Commandes exécutées une par une avec les chemins de DEVOPS :

```text
node --test --test-concurrency=1 tests/*.test.mjs
node --test --test-name-pattern='lecture seule.*before-intent-crash' tests/maintenance-bootstrap.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 -B tests/helpers/run-readonly-broker-two-uid.py --original-plugin <cache original 1.7.1>
node tests/web-monitor-browser.mjs
node --check <fichier.mjs>
python3 -m py_compile <fichier.py>
openspec validate --all --strict --json
```

CAB_TEST_ORIGINAL_PLUGIN désigne le cache original épinglé. TMPDIR et
PYTHONPYCACHEPREFIX restent sous CAB. La suite séquentielle utilise aussi les
reporters spec vers fichier et dot vers stdout. Aucun lint, typage ou build tiers
distinct n'est configuré ; ils sont non disponibles. ShellCheck est non pertinent.

## Garanties qualifiées

- Mode explicite reuse-readonly avec preuve privée, identités, UID/GID,
  manifeste, fichiers réguliers sans liens/alias et entrée du processus vérifiés.
- Trois artefacts externes exclus des destinations, sauvegardes restaurables,
  compilations sur place et bascules. Les empreintes, inodes, propriétaires,
  groupes et modes restent identiques au cours de M3.
- Version chargée 1.7.1 distincte des fichiers cibles 1.9.0. L'intention durable
  précède le premier appel de déconnexion. Le banc indépendant vérifie ce reçu
  avant de laisser disparaître le processus broker.
- Crash avant intention : repli vérifié sans déconnexion puis nouveau cycle.
  Crash après intention, réponse perdue et échec au redémarrage : gel conservé,
  rollback manuel refusé et reprise du même journal vers la cible. Aucun faux
  retour au processus 1.7.1 depuis les fichiers cibles n'est annoncé.
- Nouveau broker depuis l'entrée autorisée, enfant du même OpenCode, nouvelle
  instance et readiness fraîche ; mêmes jobs, sessions, réservations et PAUSE.
  Deuxième invocation conforme sans redémarrage. Aucun métier autorisé.
- Modes d'installation et M2 existants conservés et régressés, y compris la
  chaîne depuis l'original 1.7.1 jusqu'au contrôleur 1.9.0 puis rejet corrélé,
  retry existant, prévol neuf once/exit 0 et complete dans les seules fixtures.

Dans le conteneur Debian dédié, l'outil et les trois services sont réellement
UID 1000 ; le serveur OpenCode simulé et son vrai enfant broker sont UID 1002.
Une ouverture en écriture par UID 1000 est effectivement refusée par le noyau.
Les deux scénarios sont succès nominal et perte de réponse après déconnexion,
avec reprise puis quatre versions actives 1.9.0. Les entrées hôte et runtimes
sont montés en lecture seule ; seuls le conteneur éphémère et ses comptes locaux
sont préparés. Aucun compte, groupe, droit ou service hôte n'est modifié.
Image : sha256:a717a33469731894e77e912ea7d714e27c2dc38ee6554fd1a3102e92999cfc66.

## Cohérence et périmètre

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte conservée ; racine, autorisations et secrets respectés. |
| PROJECT.md | Version 1.9.0 et section Réutilisation du broker externe. |
| TECHNICAL.md | Politique, preuve, versions distinctes, intention et récupération explicitées. |
| BUILD.md | Distribution du nouveau module et banc isolé à deux UID documentés. |
| DEVOPS.md | Inchangé, empreinte conservée ; runtimes, navigateurs et conteneur déclarés utilisés. |
| README.md | Présentation publique 1.9.0 et nouveau mode sans activation implicite. |
| CHANGELOG.md | Entrée 1.9.0 ajoutée ; historique 1.8.0 conservé. |
| OpenSpec | Un seul nouveau change, deltas des quatre capacités concernées, validation stricte avant archivage. |
| Protocole, commande, références et manifeste | Annonces et cachebuster 1.9.0 cohérents, comparaisons de distribution réussies. |

59 fichiers existants sont modifiés dans le périmètre de code, documentation,
version et tests. Le détail et les nouveaux fichiers sont dans source-final.json.
Les anciens modules hors update et nouveau vérificateur conservent leur code
après neutralisation du seul incrément de version ; les tests nouveaux sont
identifiés séparément. Les cinq corps de garde restent strictement inchangés.
Les trois sources Python servant au lancement du broker sont bien passées à
1.9.0 dans le SCM autorisé ; leurs copies sont identiques et leurs métadonnées
finales UID/GID 1002, mode 0775 sont vérifiées. Cela ne change pas la version du
processus déjà chargé, qui n'est pas relancé ici.

Le manifeste actuel du contrôleur est lié à 91c1f44f6b66303ec479fdd0587aaad2125c1f702293e418a4a025794244bbd7 ; il remplace
l'empreinte source historique uniquement pour préparer une future activation
1.9.0. Les archives L1/L2 et leurs preuves 1.8.0 ne sont pas réécrites.
Les fichiers concernés sont UTF-8/LF, sans BOM ; aucune donnée secrète ou source
exclue n'est utilisée. Aucun état Git n'est inspecté.

## Échecs intermédiaires et limites

La première fixture de preuve déclarait le groupe du répertoire plutôt que celui
des fichiers ; les preuves ont été corrigées et la protection d'un répertoire
privé précisée sans assouplir UID/GID ou empreintes des trois artefacts. Le premier
lancement du conteneur manquait l'alias absolu du Python DevOps : les montages
runtime en lecture seule ont été corrigés dans le banc. Ces traces sont conservées.

Un passage Node parallèle a rencontré un timeout de démarrage d'une ancienne
fixture, compté comme échec du sous-test et de son parent. Aucun code produit
n'a été modifié pour le masquer : la suite complète séquentielle a réussi,
puis le scénario supplémentaire avant intention a réussi séparément.

La qualification est celle des sources CAB et des bancs décrits. La résolution
R0 annoncée par le propriétaire n'est pas réexécutée ici. L'activation réelle,
les preuves fraîches du consommateur et toute reprise métier restent distinctes ;
ACTIVATION.md expose la procédure proposée sans l'exécuter.
