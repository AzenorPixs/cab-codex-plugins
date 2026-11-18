# Conception

## État initial et attribution

À la première entrée admissible d'un change, CAB capture en PostgreSQL le projet, le change, le commit HEAD, la branche et les statuts Git de l'index et de l'arbre, sans copier les contenus ni secrets. Les entrées ultérieures réutilisent cette capture ; une session dispose de son propre point d'entrée et de son propre index, initialisé depuis la base Git courante.

Avant toute édition, les sessions réservent leurs fichiers auprès de CAB ; CAB refuse les réservations simultanées d'un même chemin. Cette protection est coopérative : elle ne peut pas empêcher l'écriture directe par un éditeur extérieur au protocole. CAB n'attribue pas implicitement les fichiers préexistants, partagés, déjà indexés par ailleurs ou modifiés sans preuve de propriété. Une étape validée transmet en un appel l'identité du RUN, un identifiant de demande stable et les chemins exacts. CAB contrôle le mandat, la réservation, les versions observées et la propriété des fichiers ; les ambiguïtés refusent l'indexation concernée. Les noms de fichiers sont traités littéralement. Les suppressions et ajouts sont pris en charge ; les fichiers exclus ou ignorés ne sont pas forcés.

## Isolation et cycle de vie

L'index de chaque session est distinct de l'index Git ordinaire. Après chaque indexation validée, CAB protège l'arbre correspondant et son commit de base par deux références Git internes propres à la session : elles ne constituent ni des branches ni des tags et ne sont pas publiées. Les références et l'index sont conservés jusqu'à la livraison confirmée, puis retirés sous vérification de leurs valeurs. Le commit porte le contenu attesté de cet index, avec la seule exception du STATISTICS.md global indexé et confirmé par CAB, sans `git add .`, et préserve les autres index et l'arbre de travail. Les références sont protégées contre les changements concurrents. Si la base change, CAB bloque ou réconcilie explicitement sans écraser les autres travaux.

L'archivage OpenSpec ne supprime pas un index encore nécessaire : commit, livraison et résolution des effets incertains peuvent lui succéder. Avant de déplacer un change, CAB doit réserver les destinations d'archive et conserver les anciennes réservations nécessaires à l'indexation des suppressions. Après l'archivage et une validation actuelle, il indexe les suppressions et les nouveaux chemins dans le même index de session, puis réconcilie le mandat archivé. Il ne doit pas livrer l'ancien chemin actif par erreur. La suppression d'un index n'est permise qu'après résultat connu, absence de modification non livrée et conservation des références de preuve. En cas de doute, l'index demeure conservé.

## Identité de connexion MCP

La connexion MCP est liée au RUN dont la source native a été vérifiée. CAB identifie le processus MCP appelant à partir des informations du socket local et de l'identité du relais enregistrée, sans identifier une session par son seul compte utilisateur. Une connexion ne peut pas être réaffectée à un autre SID tant que le RUN précédent n'est pas clos. La source native est revérifiée aux demandes Git ; l'absence de télémétrie quantitative ne retire pas un rattachement valide. La livraison peut ainsi être demandée avec la seule version.

## Livraison

Une demande de CI/CD identifiée lie le projet, la session, le change, la version, le commit et le tag. CAB valide la version et met à jour uniquement l'affectation littérale `PROJECT_VERSION` du `project.env` du projet par écriture contrôlée, sans divulgation ni altération des autres valeurs. CAB crée le commit et le tag, puis transmet la branche et le seul tag de version aux forges configurées avec protection des valeurs observées ; il n'appelle pas le CI/CD global de DIU pour refaire ces opérations. Les règles de priorité DIU déjà approuvées sont conservées : une version distante supérieure, identique ou un tag incomparable bloque l’envoi plutôt que de déplacer silencieusement un tag existant.

CAB invoque une fois les builds DIU activés sur le répertoire habituel du projet dans son état courant, puis les releases DIU activées pour chaque forge dont les prérequis sont satisfaits. Il conserve l'intention et les reçus par effet, diffuse l'avancement et distingue succès, échec, absence et état incertain. Un effet incertain n'est pas rejoué ; une reprise ne répète pas un effet déjà confirmé.

## Validation

Vérifier notamment deux sessions, les fichiers préexistants et partagés, la conservation de l'index à l'archivage, le commit limité à une session, les références concurrentes, les différentes branches de configuration DIU et la reprise après résultat inconnu. Les essais ne publient pas de modifications réelles ; la livraison finale a ses propres preuves.

## Dépendances interprojets autorisées

Le développeur a autorisé une adaptation ciblée des prompts partagés pour remplacer le parcours Git DIU par CAB. Le rattachement interprojets est générique : une autorisation persistée lie la session native vérifiée, le projet cible et les chemins autorisés ; aucun identifiant de projet particulier ne doit être codé dans CAB. Une divergence de répertoire natif ne peut être acceptée que dans ce périmètre explicitement accordé, avec preuves et révocation possibles.

Le 2026-11-18, le développeur a retiré les adaptations de DIU du périmètre. CAB invoque ses commandes existantes sur le projet dans son état au moment de leur lancement, sans répertoire de sources figées ni modification de DIU. Les sources des artefacts peuvent donc inclure des modifications présentes après le commit de livraison, notamment celles d'autres sessions. CAB conserve cette distinction dans ses reçus et ne prétend pas que l'artefact correspond exclusivement au commit. Les incompatibilités éventuelles des commandes DIU existantes sont signalées ; elles ne justifient ni modification de DIU ni changement implicite du tag de livraison.

## Rapport statistique global partagé

Le STATISTICS.md racine est une production partagée du service CAB, distincte des fichiers réservés individuellement aux sessions. Le service conserve sa réservation PostgreSQL pendant l'écriture puis indexe exclusivement ce chemin dans l'index ordinaire du projet, sous le verrou Git commun. L'intention d'indexation est enregistrée avant l'écriture. Le contenu indexé est vérifié avant la libération ; si l'effet est incertain, la protection persiste et la reprise ne fait qu'observer. Les autres fichiers indexés sont préservés, et les rapports propres aux changes conservent leur parcours de session. Cette indexation ne crée pas de commit.

## Décision de livraison du 2026-11-18

Le développeur conserve le seul tag 3.2.16 et diffère les releases DIU, dont le contrat installé impose un tag préfixé v. CAB conserve une politique explicite, bornée au RUN et à cette version, puis marque ces étapes SKIPPED/developer-deferred. Les builds et les publications Git restent demandés. Le moteur ne modifie pas DIU et n'ajoute pas de tag de compatibilité. Les sessions antérieures à l'activation du nouvel instantané ne disposent pas d'une capture de démarrage rétrospective ; cette absence doit rester explicite.

## Amorçage d'un RUN antérieur

L'entrée administrative d'adoption est limitée aux RUN directs créés avant la migration 0030 et dépourvus de capture ou d'index initialisés. Elle exige une liste exacte de fichiers, le statut Git et la révision attendus, une autorisation explicite et la même source native vérifiée. L'observation enregistrée est legacy-adoption, datée au moment réel ; les nouveaux RUN ne peuvent pas utiliser cette entrée. L'index ordinaire n'est pas vidé : les entrées adoptées sont figées par empreinte et ne seront remplacées par le commit que si elles sont restées identiques. Les autres entrées sont conservées. Les actes administratifs de réserve, d'indexation et de livraison de cet index sont audités et exigent un relais natif vivant.

Le collecteur CAB atteste uniquement l'objet tag envoyé et vérifié, après confirmation des étapes. Le producteur de finalisation est une identité interne non connectable ou une délégation administrative explicite bornée au RUN/version. Les releases différées restent SKIPPED ; aucun succès DIU n'est inventé.

Le comparateur de livraison reconnaît les horodatages historiques à cinq champs séparés par des points et à six champs séparés par des tirets, avec validation de la date. Ils ne prennent pas la priorité d'une version ; les versions égales ou supérieures et les autres tags incomparables restent refusés. Les tags historiques ne sont ni déplacés ni supprimés.

Les rapports statistiques CAB peuvent être amendés pendant la livraison sans
invalider les preuves du code. La préparation conserve les vérifications des
fichiers de code et fige les rapports du change dont le contenu local correspond
à la projection CAB, hors réservation étrangère. Les mesures locales continuent
ensuite leur cycle ; le commit n'est pas présenté comme un bilan définitif de
la période qui se termine après la livraison.

## Attente explicite du dépôt des prompts

Le développeur a demandé d'attendre la fin des travaux existants dans le dépôt des prompts avant toute adaptation. Le rattachement générique est qualifié, mais ce travail documentaire est mis en pause dans un RUN distinct et ne doit pas être présenté comme réalisé ou publié avec CAB. Le protocole distribué par les plugins CAB/CICD est inclus dans la présente livraison.
