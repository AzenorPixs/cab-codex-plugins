# STATISTIQUES — SCM CAB 1.10.9

## 1. Cadre, autorisation et identité

Projet : Codex Approval Bridge (`cab`), racine `/home/devops/datas/cab`.
Session directe SCM, demande explicite : remplacer le garde d'état de CABU par
un arrêt/redémarrage forcé des unités systemd CAB, installer tous les fichiers,
permettre la poursuite sans OpenCode et incrémenter les briques en 1.10.9.
Rapport produit le 2026-10-27T19:21:35Z. L'identifiant précis du modèle est
N/A, non observé dans les données locales de cette session. La compétence de
statistiques SCMP n'a pas été invoquée. Quotas, sondes périodiques et compteurs
de messages sont N/A : non collectés pour une session SCM directe.

## 2. Réalisations et périmètre

Sept tâches du change ont été validées. Le flux CABU/CAB update valide et
stage le paquet, arrête systématiquement controller, supervisor et monitor,
remplace les quatre briques, recharge systemd et redémarre les trois unités.
Les états RUN et la coordination CAB ne servent plus de précondition. Si
OpenCode ne répond pas, les fichiers broker sont installés et seul son runtime
est rapporté `INDISPONIBLE`. Les sauvegardes et le repli restent actifs.

La version 1.10.9 a été propagée aux modules Python/Node, aux fichiers broker,
au plugin, aux unités, au Web, aux commandes et au package Python. Plugin local
installé : `1.10.9+codex.20261027184128`. CAB.md, CABU.md et cab.md dans le
profil Codex sont en 1.10.9 et correspondent octet pour octet aux sources
locales. La marketplace `cab_codex_plugins` est configurée depuis la racine
locale CAB, car GitHub publie encore 1.10.7. Aucun commit ni push n'est inclus
dans cette mesure de déploiement. Le nombre de fichiers Git modifiés est N/A
à la production de ce rapport ; il sera relevé au jalon Git conditionnel.

## 3. Tests et validations observés

| Contrôle | Résultat | Total et limites |
| --- | --- | --- |
| Suite Node | Réussie | 441 cas : 415 réussis + 26 ignorés = 441 ; 0 échec |
| Suite Python | Réussie | 73 tests, 0 échec |
| Syntaxe Python | Réussie | 11 fichiers compilés par `py_compile` |
| Web Monitor navigateur | Réussie | Chromium et Firefox, tous deux headless |
| OpenSpec strict avant archivage | Réussie | 15 éléments, 0 échec |
| OpenSpec strict après archivage | Réussie | 14 spécifications, 0 échec |
| Updater CAB ciblé | Réussi | arrêt/redémarrage forcés, RUN actif ignoré, broker absent, stale receipt, rollback |

Les 26 tests Node ignorés sont ceux que le runner a explicitement marqués
`skipped`; ils ne sont pas présentés comme exécutés. Les métriques de session
de codage ou de quotas n'ont pas été collectées et restent N/A.

## 4. Déploiement et versions réellement observées

Transaction : `update-e8c83cc0-18f2-4f41-896d-cc4519a5deba`, état `completed`,
version cible 1.10.9. Controller, supervisor et monitor sont actifs et
répondent chacun en 1.10.9 pour le workspace `/home/devops/datas/pixs`. Les
fichiers broker dans `/home/devops/datas/cab/src` sont en 1.10.9. L'API
OpenCode sur l'endpoint observé ne répond pas ; le broker runtime est donc
`INDISPONIBLE`, sans bloquer le remplacement des fichiers ni la réussite du
redémarrage systemd.

Source GitHub observée : plugin 1.10.7 et commandes 1.10.7. Le plugin, la
marketplace locale, les fichiers du profil Codex et les processus CAB sont en
1.10.9. La marketplace GitHub n'a pas été publiée ni modifiée. L'updater forcé
n'a émis aucune requête de lecture ou de suspension des RUN et n'a pas modifié
leurs états ; il a seulement vérifié les versions et workspaces après le
redémarrage.

## 5. Durées et mesures disponibles

Suite Node : 22.313 s. Suite Python : 4.133 s. Durée navigateur exacte,
durée totale SCM, temps de rédaction, consommation de jetons, quotas et
répartition des messages/outils : N/A, aucune télémétrie exhaustive fiable
n'ayant été collectée. Les suites Node, Python et navigateur sont rapportées
séparément et ne sont pas additionnées entre elles.

## 6. Clôture, traçabilité et limites

Archive : `openspec/changes/archive/2026-10-27-automate-cab-update-lifecycle-1-10-8`.
Les tâches 1 à 7 sont cochées ; le change et les spécifications consolidées
ont passé OpenSpec strict. Le blocage 1.10.8 lié à `update-opencode-required`
reste conservé ci-dessus comme constat historique ; l'addendum consigne sa
résolution en 1.10.9. Le rapport est UTF-8/LF avec six sections et les totaux
Node cohérents.

Le registre Git, le commit et les publications Forgejo/GitHub/GitLab ne sont
pas encore inclus dans ce rapport ; les étapes SCM conditionnelles suivent
cette mesure et seront restituées séparément. Aucune publication distante de
la version 1.10.9 n'est affirmée.
