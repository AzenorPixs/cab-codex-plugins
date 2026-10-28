# CT13 — Migration exclusive vers OpenCode V2

## Pourquoi

OpenCode V2 expose une API HTTP authentifiée sous `/api`. La version CAB précédente utilise encore des routes V1 sans préfixe et interprète parfois une page HTML `200` comme un état exploitable. Le contrôleur, le superviseur et le moniteur ne peuvent donc pas établir l'état natif d'une instance V2.

Cette évolution constitue une nouvelle version majeure CAB : toutes les briques distribuées passent à `2.0.0`. OpenCode 1.x, dont 1.19.x, est définitivement refusé.

## Modifications

- Remplacer les accès natifs OpenCode de toutes les briques CAB par un client HTTP V2 commun.
- Refuser toute version dont la version majeure n'est pas `2`; aucun appel V1 ni repli V1 ne sera conservé.
- Authentifier les requêtes par Basic Auth depuis un fichier local privé, sans exposer le secret dans le dépôt, les arguments, les URL ou les journaux.
- Normaliser et valider les enveloppes V2, les permissions, les sessions, les événements SSE et les erreurs HTTP.
- Remplacer les références documentaires V1 et actualiser l'inventaire DIU généré.

## Capacités concernées

- `opencode-v2-transport` (nouvelle capacité)
- `codex-integration-distribution`
- `controller-transport`
- `supervision-remediation`
- `active-component-update`

La version de base du broker, des scripts, plugins, skills, commandes et unités CAB sera `2.0.0`.

## Hors périmètre

- Modifier ou redémarrer le service OpenCode déjà actif.
- Déployer les fichiers CAB dans le profil utilisateur ou reconnecter son broker.
- Réconcilier le RUN bloqué observé dans Pixs.
- Lire ou transmettre le mot de passe OpenCode.
- Conserver une compatibilité avec OpenCode 1.x.

## Validation

- Tests unitaires des réponses V2, enveloppes, pagination, authentification, erreurs `401`, contenu HTML inattendu et refus de toute version majeure différente de `2`.
- Régressions ciblées et suite CAB Node/Python.
- `openspec validate --all --strict`.
- Sondes authentifiées et non mutantes sur OpenCode V2 2.2.0, si le credential local est provisionné.
- Qualification de `request_validation` et de la permission native unique `once` dans un environnement isolé. Le RUN actuellement bloqué ne sera pas réutilisé comme banc.
- Les réconciliations historiques dépendant du champ V1 `user.tools` doivent échouer fermées si OpenCode V2 ne fournit pas une preuve équivalente.
