# Qualification minimale CAB 3.0.0 — 11 novembre 2026

## Résultats observés

| Contrôle | Résultat |
|---|---|
| Domaine Django/PostgreSQL réel | 10 tests réussis |
| Journalisation et rechargement réel | 3 tests réussis |
| Parcours paquet et MCP réel | Initialisation Web locale, atelier direct/piloté, absence de rejeu, coordination autonome, revue sur reçus et reprise après maintenance réussis |
| PostgreSQL natif dédié | Aucune base CAB avant parcours ; cluster17/cab et 16 migrations après validation Web |
| Electric1.8.1 réel | Snapshot, changement validé, reconnexion sans doublon, refus anonyme réussis |
| Navigateurs headless | Chromium156.0.8078.79 et Firefox153.6.0 : connexion, sessions Electric, mobile et navigation réussis |
| Journald réel | Priorité DEBUG7, composant et message expurgé reçus ; PID conservé |
| Mise à jour de la plateforme configurée | Identités, reçus et revue inchangés ; cycle complet mesuré5,18s |
| Distribution Codex native isolée | Plugin CAB3.0.0 installé depuis catalogue local, réinscription idempotente |
| Syntaxe et construction | Python, sh/ShellCheck, TypeScript et Vite réussis |
| OpenSpec | Validation globale stricte :29 éléments réussis avant archivage |
| Adaptation DIU | 37 tests ciblés et134 éléments OpenSpec réussis ; paquet DIU1.3.10 installé |

Les résultats structurés sont dans PREUVES.json. Les traces détaillées sont
conservées localement dans output/scm/cab-3.0.0, sans secret de compte versionné.

## Portée et limites

Le conteneur Debian ne possède pas systemd en PID1 : ses hooks sont vérifiés
avec un adaptateur de test qui lance le vrai serveur ; l’unité, journald et
l’activation système sont vérifiés séparément sur l’hôte. La première tentative
de sandbox a rencontré la restriction de namespaces du conteneur ; la campagne
réussie utilise un conteneur dédié privilégié, sans modification de l’isolation
livrée. Un défaut d’ordre des montages directs a été corrigé avant la campagne
réussie. Les sources qualifiées sont celles du paquet de la dernière campagne.

Le prépaquet de qualification utilise la version courante de PROJECT_VERSION ;
seule la CI/CD finale met les métadonnées Debian à3.0.0. Ces prépaquets ne sont
pas des releases. Les preuves de publication et CABU doivent identifier le
paquet final3.0.0 et sa version réellement active.

Les tests de transport SSH historiques sont réutilisés comme sources, sans
nouvelle campagne de recettes métier Pixs ni réarmement de son RUN clôturé.
La migration qualifie le chiffrement, l’idempotence, les identités et protections,
et les cumuls SGS sans addition des snapshots cumulatifs. Le premier parcours
Web de production reste une action humaine ; le paquet n’invente pas ses
credentials et ne crée aucune base CAB avant cette validation.

L’instantané SGS de cette session ne contient pas de compteurs natifs : tokens,
coûts et répartitions non observés restent N/A. Aucun volume n’est estimé.
La sauvegarde administrative logique inclut configuration et état privé ; les
objectifs de rétention hors machine, PITR, RPO/RTO et coupure générale ne sont
pas présentés comme des mesures acquises par ces essais minimaux.

## Livraison et activation

La CI/CD autorisée cible CAB3.0.0. Les reçus de fournisseurs, empreintes du
paquet, unité active, intégrations et état Web seront conservés séparément
après la publication, puis rapportés au développeur. Une archive source seule
ne prouve pas l’activation. Les autres changes ouverts restent inchangés.
