# Pilotage — CAB 2.2.29

## `/CAB run`

Exécute un job piloté dans la session persistante après un `/CAB start` et un
`/CAB test` réussis.

1. Constitue un contrat de job : identifiant de job, session OpenCode,
   répertoire cible, change OpenSpec éventuel et critères de fin. Arme-le par
   `POST /runs/<run_id>/job/arm` du contrôleur avant tout mandat. Ce contrat ne vaut jamais
   une décision d'approbation d'action et ne contient ni secret ni contenu du
   projet. Si le prompt parent exige l'identité stricte des commandes, notamment
   CISMP, arme ce contrat avec `strictCommands: true` pour refuser tout suffixe.
   Publie chaque jalon prouvé et mandat courant par `POST /runs/<run_id>/job/progress`.
   Pour chaque change, charge le skill `coding-session-statistics` du plugin
   CAB avant le premier travail et prépare les relevés et sondes prévus. Ajoute
   aux critères de fin la preuve du rapport après archivage définie ci-dessous.
2. Avant chaque édition, commande Bash, commande système ou commande OpenSpec
   qui exige une permission native, l’agent de codage crée un mandat CAB
   unitaire : `requestId`, `approval_id`, `change_id`, session, répertoire,
   résumé et exactement un fichier relatif ou une commande complète.
3. Codex examine chaque mandat dans la session persistante et rend une décision
   explicite, unique et corrélée. Après une décision `approved`, CAB répond
   `once` à la seule permission native OpenCode correspondante, dans la
   location exacte de la session via le scope HTTP `x-opencode-directory`, puis
   consomme ce mandat. Ne jamais répondre depuis la location par défaut du
   client lorsqu’elle diffère de celle de la session.
4. Une seconde permission, une autre commande, un autre fichier ou une demande
   sans décision corrélée reste en attente. CAB ne l’acquitte jamais seul et
   l’écart est remonté à l’orchestrateur.
5. Après chaque tour de l’agent de codage, contrôle la session persistante. Si
   le contrat n’est pas terminal, envoie le mandat suivant sans créer de session
   éphémère et sans conclure la réponse Codex. Si une interruption empêche ce
   mandat, le superviseur CAB réexamine la même session après 60 secondes ; il
   ne crée ni décision ni session de remplacement.
6. Le job devient terminal uniquement si tous ses critères sont satisfaits, si
   CAB retourne `BLOCKED` ou `HUMAN_REQUIRED`, ou si le développeur l’arrête
   explicitement. À ce moment seulement, publie le bilan final puis clôture le
   contrat côté CAB.

### Statistiques obligatoires après archivage

Pour chaque spécification archivée avec succès, l'orchestrateur fait produire
`openspec/changes/archive/<archive>/STATISTICS.md` selon le skill embarqué
`coding-session-statistics`. L'archivage doit rester explicitement autorisé.
Après sa preuve, relève le quota final et la fin de l'intervalle avant la
synthèse, puis transmets un mandat d'édition distinct pour ce seul rapport.
La commande `/CAB` ne rédige pas elle-même de fichier dans le projet piloté.

Vérifie l'existence, les six sections, UTF-8/LF et la cohérence des totaux,
puis publie ce jalon prouvé par `POST /runs/<run_id>/job/progress` avant de demander le gate
terminal normal `TERMINÉ`. Un lot exige un rapport par archive, avec le
périmètre et les bornes propres à chaque change. Le skill lit les quotas
avec l'outil natif Codex et n'exige pas le skill `cgpt`.

Toute donnée manquante est signalée `N/A` avec sa cause, sans mesure inventée.
Si l'archivage échoue, ne présente pas un rapport final après archivage. Si
le rapport échoue alors que l'archive existe, signale le cycle incomplet et
reprends seulement le rapport avec un nouveau mandat, sans réarchiver.
Ne demande pas la clôture normale `TERMINÉ` sans preuve du rapport ; une
clôture `BLOQUÉ` ou un arrêt explicite conserve la cause et le travail restant.
