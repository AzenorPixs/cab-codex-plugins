# Statistiques SCM — CAB 2.1.1

## 1. Statistiques générales et décisions

Session directe, change align-uppercase-cab-identities-2-1-1. Périmètre : vérification des identifiants publics CAB/CABU, correction du plugin et du skill principaux, patch commun 2.1.1, tests, documentation, archivage, clôture Git conditionnelle et déploiement qualifié. Aucun skill de statistiques pilotées invoqué. Durée complète, modèle exact, tokens et quotas : N/A, non relevés initialement.

## 2. Types de messages et d'outils

Compteurs exhaustifs de messages et appels : N/A, non instrumentés. Suite Node : 457 déclarés, 431 réussis, zéro échec final, 26 non exécutés (profils historiques sans paquet original et scénario OpenCode isolé optionnel). Python : 73 réussis. Total déclaré : 530 ; exécuté : 504 ; non exécuté : 26 ; réussite des contrôles exécutés : 100 %. Le déploiement réel intervient après publication depuis GitHub et ne se déduit pas des tests source.

## 3. Fichiers modifiés

Inventaire des 66 sources et supports alignés : PREUVES-SCM.json. Identifiants : plugin CAB, skill CAB, /CAB ; plugin et skill CABU, /CABU ; marketplace affichée CAB Codex Plugins. Le skill auxiliaire coding-session-statistics reste sous le namespace CAB. Les chemins techniques, services et alias /cab sont conservés. Les archives et preuves runtime historiques restent inchangées. Nombre de lignes ajoutées/supprimées : N/A, aucun diff Git analysé.

## 4. Commandes

`node --test tests/controller-service-distribution.test.mjs tests/active-component-update.test.mjs` : 65 succès lors du premier contrôle ciblé. `node --test tests/*.test.mjs` : 431 succès et 26 scénarios optionnels non exécutés, zéro échec. `python3 -B -m unittest discover -s tests -p 'test_*.py'` : 73 succès. Syntaxe : 25 modules Node et 6 fichiers Python ; trois copies broker identiques, UTF-8/LF conforme. OpenSpec strict : 16 éléments valides avant archive. Archivage réussi : une exigence ajoutée et trois modifiées, aucune supprimée ni renommée.

La garde cab-source exige le manifeste CAB ; les sélecteurs actifs utilisent CAB@cab_codex_plugins et CABU@cab_codex_plugins. La version précédente 2.1.0 reste qualifiée dans la preuve du broker. La qualification réelle des plugins, commandes de profil et quatre versions chargées suit le commit et les publications conditionnelles ; son résultat est restitué dans le bilan final et le journal privé de l'updater. Le blocage métier STORE_JOURNAL_DIVERGENCE est distinct de ce patch et aucune purge n'est autorisée.

## 5. Accès web

L'exploration et la qualification source utilisent les fichiers du projet. Publications et installation suivent les étapes SCM propres à chaque fournisseur ; chaque source distante est vérifiée séparément. Nombre exhaustif de requêtes : N/A. Aucun secret, contenu brut de project.env ou identifiant fournisseur transmis au modèle. Aucun accès au contenu privé des états RUN pour cette vérification de nommage.

## 6. Synthèse globale

Le patch 2.1.1 aligne les identifiants publics et la version de distribution tout en conservant les contrats runtime et chemins d'installation. Le bilan documentaire par fichier figure dans PREUVES-SCM.json. Les sauvegardes du paquet précédent et le gestionnaire Codex encadrent la migration de l'ancienne identité ; aucun cache n'est édité manuellement. Les mesures absentes restent N/A. Ce rapport possède six sections UTF-8/LF et ses totaux sont vérifiés ; il constitue une preuve de qualification source, pas une preuve anticipée de déploiement.
