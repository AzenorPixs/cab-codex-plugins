# Bancs externes autonomes — cab-external-exec-v1

## Cadrage
Le profil est un transport SSH vers un banc conteneur déjà déclaré et réservé
(lxc ou docker). Il ne donne ni shell hôte libre, ni socket, ni allocation nouvelle.
L’atelier local conserve son isolation ; les commandes externes restent dans
le banc alloué et sa politique réseau existante. Le codeur choisit ses essais,
les corrige, prépare les outils déjà autorisés et nettoie les fixtures en autonomie.
La plateforme distante doit fournir Python3 et un SSH vérifiable ; aucune
installation implicite sur l’hôte du broker. Les comptes/cibles sont ceux du banc.

## Préparer une seule fois
Découvrir external_describe puis l’appeler avec request_id, run_id,
reservation_version, session_id, change_id, directory et profile :

```json
{"id":"test-bank","kind":"ssh","resource_key":"lxc:host-a/100","host_key":"SSH_TEST_HOST","user_key":"SSH_TEST_USER","password_key":"SSH_TEST_PASSWORD","container":"lxc"}
```

port_key est facultatif (22 par défaut), known_hosts peut désigner un fichier
absolu de clés hôtes publiques connu de l’utilisateur du broker. Sinon son
~/.ssh/known_hosts est utilisé. Les noms de variables sont génériques, pas liés
à un projet. Le processus local lit seulement les affectations littérales
sélectionnées du project.env racine, sans exécution/interpolation ni restitution
des valeurs. Clé dupliquée ou ambiguë : refus fermé. Le password reste en mémoire
et transite vers sshpass par FD, jamais dans argv ni dans le résultat. Les clés
hôtes approuvées sont figées pour la connexion ; aucun StrictHostKeyChecking=no.

Le résultat donne le profil public et connection_fingerprint, sans credential.
L’orchestrateur le met dans externalAdapters du mandat initial, ou l’attache une
seule fois à l’exception approuvée par POST /runs/<RUN>/external/adapters :
version, exceptionId et profile. Une exception approuvée ne crée pas à elle seule
l’adaptateur ; l’état ADAPTER_READY prouve sa disponibilité effective.
GET /runs/<RUN>/external/status expose profils et états sans jeton de bail.

## Exécuter, consulter, soumettre
external_execute reçoit les identités usuelles, adapter_id, argv, timeout_ms
facultatif et phase test/cleanup/verify-cleanup (test par défaut). argv est passé
au runner fixe du banc par JSON, sans interpolation dans une commande hôte.
Le runner vérifie l’instance conteneur ; une divergence de cible/configuration
refuse le lancement. Le bail HELD, sa génération et son fencing sont vérifiés
mécaniquement ; une ressource restaurée non réconciliée ne devient pas utilisable.
Aucune approbation intermédiaire n’est nécessaire après ADAPTER_READY.

files permet de transférer au plus128 fichiers autorisés (16Mio au total) :
path relatif au projet, destination relative facultative et sha256 facultatif.
Le serveur qualifie les sources et leurs empreintes, le runner les écrit dans
son répertoire de travail propre à la requête. Aucun env, secret, lien physique
partagé ou symlink ne passe. Le codeur peut lire les dépendances déclarées ;
il n’obtient aucun droit supplémentaire sur les sources hôtes.

Le résultat expose état, exitCode, sortie expurgée, empreinte, artefacts et
révision source. Les receipts locaux et distants sont persistants et privés.
Les états en 0770/2770 détenus par l'utilisateur sont compatibles ; les
anciennes permissions privées restent acceptées, sans normalisation forcée.
Une identité connue n’exécute jamais à nouveau la commande. external_status
avec le même request_id/adapter_id relit le reçu puis, si nécessaire, consulte
seulement le journal distant. UNKNOWN garde sa protection et son bail : aucune
absence de réponse ou de journal n’autorise un rejeu. Les unités locales
indépendantes peuvent continuer. La soumission/publication finale reste bloquée
si un effet externe est incertain. Les timeouts et échecs ne deviennent pas des succès.

Après un premier grant, une erreur de prévol privé attestée par le broker
authentifié avant transport est enregistrée automatiquement `PREFLIGHT_FAILED`.
Ce statut ne constitue pas un reçu de test ; le bail et l’identité restent
conservés. Le codeur peut poursuivre son mandat avec une nouvelle identité
d’appel, sans rejouer celle qui a échoué. Une attestation non acquittée ou
un grant antérieur conserve la protection d’un effet incertain.

Pour une intention historique 2.7.1, le propriétaire peut examiner la preuve
avec `GET /runs/<run>/external/preflight-evidence`, paramètres `requestId` et
`sourceReceiptId`, puis utiliser `reconcile-external-preflight` dans la
politique de reprise du RUN, avec les empreintes fraîches du plan et de la
preuve. Le contrôleur contrôle deux observations cohérentes avant toute
mutation. Une preuve incomplète refuse la réconciliation ; aucun reçu de test
n’est fabriqué et le bail reste détenu.

Les résultats terminaux vérifiés sont référencés directement dans autonomy_submit
par requestId, criterion et outcome ; le contrôleur joint le receiptDigest complet.
La révision testée doit rester celle soumise et les tests sont examinés à la revue
finale. Un résultat d’outillage ne qualifie pas une fonctionnalité métier par lui-même.

## Restituer le banc
Avant soumission finale, le codeur réalise cleanup puis verify-cleanup sous le
même profil/bail, avec deux identités distinctes et des contrôles adaptés aux
fixtures réellement créées. Les bibliothèques de test que DEVOPS autorise à
conserver ne sont pas désinstallées par supposition.
external_release fournit les identités et cleanup_request_id,
verification_request_id ; pour un bail groupé, proofs liste une paire par ressource.
Le contrôleur exige deux résultats COMPLETED/exit0, leur ordre, la couverture
complète du bail et l’absence d’effet incertain. Il restitue sans exposer de token.
Cette vérification mécanique n’est pas une validation métier du contenu des tests ;
l’orchestrateur garde la revue finale. La voie release-unused ne peut pas effacer
l’historique d’un banc réellement utilisé par l’exécuteur externe.

## Reprise et limites
Ni SID, RUN, mandat, reçus ni bail ne sont remplacés pour sortir d’un incident.
Les profils restent liés à leur génération ; un changement de cible impose une
nouvelle approbation bornée. Après première utilisation, un retour à un runtime
antérieur exige une réconciliation explicite ; ne restaurer aucun ancien état
qui ferait disparaître une intention. La qualification d’une voie SSH Docker ne
prouve pas à elle seule les scénarios produit d’un profil Desktop ou LXC.
