# CAB 1.10.7 — modèle de codage et PLLM automatique

## Priorité du prompt

Le dernier choix concret explicitement autorisé conserve sa priorité et peut remplacer à chaud le choix précédent via la transition dédiée. Sinon utiliser la PLLM en mode automatique, dans les priorités publiées (1 à 6 pour le schéma 2, 1 à 7 pour le schéma 3), sans figer un fournisseur ou un nom de modèle. Distinguer l'identifiant API model_id du nom commercial model. Le raisonnement explicitement spécifié reste prioritaire. Sans niveau explicite, demander medium. Si medium n'est pas disponible, examiner high sur le même modèle. Examiner la politique PLLM de priorité inférieure seulement si medium et high sont indisponibles ; ne pas choisir implicitement un autre niveau.

Un modèle explicitement imposé qui ne prend pas en charge le niveau de raisonnement requis reste conservé et bloque. Aucun repli automatique vers un autre modèle n'est autorisé dans ce cas. Un niveau explicitement imposé indisponible bloque aussi pour ce modèle. Dans la sélection automatique, examiner les politiques suivantes qui satisfont ce niveau exact.

## Catalogue public du skill actif

Résoudre le skill PLLM effectivement actif, puis son data/pllm-current.json public. Configurer le contrôleur autorisé avec OC_Codex_PLLM_CATALOG absolu ; OC_CGPT_PLLM_CATALOG reste un alias seulement en absence du nom principal. Ne jamais pointer un fichier de secrets ou de configuration privée. Un catalogue absent, invalide, lié ou ambigu est refusé sans autre recherche. Cette préparation source n'installe pas cette configuration dans un service actif.

Les couples schéma 2 / six politiques et schéma 3 / sept politiques sont admis strictement ; leurs priorités sont contrôlées. N'utiliser que les entrées Valide évaluées dans cette publication, evaluated_this_run=true, avec dates cohérentes. Une publication active peut conserver des lignes historiques des politiques non visitées : elles ne sont pas des candidates actuelles. En cas de besoin, faire évaluer les politiques nécessaires par le skill actif selon les accords applicables ; ne pas modifier son évaluateur ni présenter sa mémoire comme preuve actuelle. Une simple lecture du catalogue ne lance aucun benchmark.

La sélection publiée low ne prouve pas la disponibilité ou les performances de medium. Vérifier GET /api/provider de l'OpenCode V2 ciblé : fournisseur connecté, identifiant exact et variantes réellement exposées. Une variante absente ou désactivée est indisponible. Une métadonnée manquante, une erreur d'authentification, de quota ou de réseau n'est pas une preuve d'incompatibilité du raisonnement ; arrêter avec la cause, sans bascule spéculative.

## Résolution, prévol puis armement

1. Après bootstrap du monitoring, résoudre les exigences du prompt. POST /model-policy/resolve reçoit un objet contenant model et reasoning seulement si explicitement fixés ; model est providerID/modelID. Avec {}, le défaut est PLLM automatique avec medium. Si medium est indisponible, la sélection essaie high sur le même modèle avant la politique PLLM suivante. La réponse est un choix proposé avec preflightRequired=true, jamais une autorisation ni une preuve de génération.
2. Selon les accords de transmission applicables, préparer le fournisseur par la voie standard permise, sans exposer de secret, puis exécuter un prévol borné sans outil sur le fournisseur, modèle et variante exacts. Préserver OpenCode et les pairs ; toute maintenance commune demeure distinctement autorisée. Une réponse tronquée, une erreur ou une autre variante ne réussit pas ce contrôle. Ne pas assimiler le benchmark low à ce prévol. Aucune nouvelle évaluation fournisseur n'est déclenchée par le serveur CAB lui-même.
3. Avant de supprimer la seule session temporaire du prévol, armer le job avec modelSelectionProtocol=pllm-auto-v1, modelSelection={model?,reasoning?} et modelPreflight={sessionId,messageId}, en plus du contrat de job. Le contrôleur relit le catalogue et les capacités ; il corrèle la session au workspace, le message assistant terminé avec finish=stop, son parent utilisateur, le fournisseur, modèle et variant exacts, ainsi qu'une réponse texte sans outil. Une preuve divergente refuse l'armement.
4. Vérifier GET /runs/<runId>/job : codingModel conserve fournisseur, modèle, raisonnement, provenance, priorité, empreinte de catalogue et référence du prévol. Ensuite seulement effectuer les prévols et mandats CAB ordinaires. Le catalogue ne remplace ni permission once ni gate.

Tout nouveau job piloté par le protocole 1.10.7 négocie pllm-auto-v1, même si modelSelection est {}. Les contrats historiques non négociés et les jobs déjà persistés restent lisibles, sans prétendre qu'ils ont adopté ces nouveaux défauts. Un champ codingModel fourni directement par le client est refusé : il est produit par le serveur après preuve.

## Reprise et responsabilités

Appliquer la section « PLLM Automatique — fraîcheur initiale et conservation du choix » du protocole commun : fraîcheur de huit heures au seul démarrage initial, conservation du choix du RUN pendant la session et réévaluation sur panne réelle ou instruction explicite. Sans politique admissible, conserver état et preuves et attendre l'instruction du développeur, sans benchmark ni réessai automatique. Les sondes statistiques ne renouvellent jamais ce choix.

Hors transition explicite qualifiée, un job conserve son choix après redémarrage. Son réarmement ne peut changer fournisseur, modèle, raisonnement ou politique ; une répétition identique conserve la preuve initiale. Le superviseur transmet explicitement model={providerID,modelID} et variant=reasoning dans ses messages de reprise, et recontrôle que le choix n'a pas changé pendant ses lectures. Il ne sélectionne pas un nouveau modèle en attente d'une décision, d'une ressource ou d'un effet inconnu.

Un changement de choix exige une nouvelle frontière autorisée et un contrat cohérent, sans rejouer une permission. Le broker transporte les décisions sans choisir de LLM. Le moniteur reste sans LLM. Le validateur Codex conserve son moteur et son rôle distincts du modèle de codage OpenCode. Aucune propagation aux prompts consommateurs, configuration de fournisseur ou activation runtime n'est déduite du travail source.

## Contrats de référence et qualification

Les API publiques sont décrites dans [OpenCode Server](https://docs.opencode.ai/docs/server/) et les variantes dans [OpenCode Models](https://docs.opencode.ai/docs/models/). La qualification SCM utilise catalogues et services natifs simulés, plus les suites de distribution et de reprise. Elle ne prouve aucune génération medium auprès d'un fournisseur réel et ne modifie pas les agents actifs.

## Variante exposée mais explicitement rejetée

Si un prévol échoue pour un paramètre de raisonnement reconnu, transmettre dans modelSelection.unavailablePreflights les références {sessionId,messageId} de ces échecs, au maximum douze. Le contrôleur relit les messages natifs et leur parent, vérifie workspace, fournisseur, modèle, variante et date postérieure à l'évaluation actuelle. Il n'admet que APIError HTTP 400 avec un code reconnu d'incompatibilité et un paramètre de raisonnement connu. Les refus 401/403/429, erreurs réseau et paramètres étrangers ne justifient aucune exclusion de variante.

Un rejet prouvé de medium permet d'examiner la politique automatique suivante. Le modèle explicite reste bloquant. Le choix final exige toujours son propre prévol réussi. codingModel conserve seulement les identités et références filtrées des échecs, jamais leurs corps bruts ou messages libres.

Un retour à un ancien contrôleur ou superviseur après un armement négocié n'est pas qualifié : conserver les états récents et un lecteur compatible jusqu'à réconciliation. Les versions identiques du jeu chargé ne dispensent pas de vérifier la capacité pllm-auto-v1.

## Budget de lecture défini par la session — 1.10.7

La session de pilotage fixe explicitement `providerMaxBytes` en octets dans le corps de `POST /model-policy/resolve`, puis répète ce champ dans `modelSelection` lors de l'armement négocié. Exemple de structure : `{ "model": "<fournisseur>/<modèle>", "reasoning": "medium", "providerMaxBytes": <budget_entier_en_octets> }`. La valeur appartient à la session ; CAB l'applique exactement au seul `/api/provider` de cet appel et n'ajoute pas de plafond fixe. Elle doit être un entier sûr strictement positif ; null, chaîne, fraction et dépassement d'entier sûr sont refusés avant observation.

En omission, le défaut compatible reste 2 Mio. Les observations de sessions/messages et le fichier public PLLM gardent leurs bornes distinctes de 2 Mio. Le budget n'est pas global, ne se transmet pas implicitement à un autre appel et ne change aucun modèle ou job déjà armé. Les flux trop grands sont interrompus avant parsing et refusés avec `model-observation-too-large`. Aucun corps /provider, paramètre privé ou erreur brute ne doit être copié dans une sortie, un rapport ou un job. Le prévol exact, les permissions et les gardes de modèle restent inchangés.

## Préparation et identités natives — 1.10.7

Pour la sélection automatique, avant le démarrage autorisé, résoudre la racine du skill PLLM actif puis appeler `node <plugin>/scripts/cgpt-approval-bridge-prepare-model-policy.mjs --pllm-skill-root <racine-absolue>`. Un chemin explicite peut être fourni avec `--catalog-path <chemin-public>`. La préparation privilégie la variable principale, son alias historique en absence du principal, puis le fichier data/pllm-current.json sous la racine fournie ; aucune recherche de configuration privée n'est effectuée. Un chemin explicite vide ou invalide bloque sans repli silencieux. Le lecteur conserve les gardes de fichier et de publication.

L'outil restitue uniquement catalogPath, source et environment={OC_Codex_PLLM_CATALOG:...}. Il ne modifie aucun fichier ou service. Le démarrage autorisé fusionne ce patch dans la configuration du contrôleur en préservant ses autres options. Contrôler ensuite /model-policy/resolve avec providerMaxBytes fixé par le pilotage : la réussite du CLI seule ne prouve pas que le processus a reçu la variable. Sans catalogue valide ou résolution réussie, ne pas armer de nouveau job. La lecture ne relance aucune évaluation PLLM et ne modifie pas les dates publiées.

Le sélecteur privilégie toujours l'identifiant natif exact publié. Si le catalogue porte opencodego et que cette identité est absente, le seul rapprochement connu est opencode-go, unique, connecté et publiant le modèle exact. Aucun retrait arbitraire de ponctuation ni autre fournisseur ne sert de substitut. Une identité exacte présente mais déconnectée bloque. La sélection automatique conserve logicalProviderID, providerID natif, mode, priorité et digest du catalogue original ; les prévols et messages utilisent le natif. Le modèle explicitement imposé conserve son identité exacte. Les preuves de repli sont corrélées à cette même correspondance sans changer l'ordre PLLM.

Le prévol et l'indisponibilité lisent parent.info.model.variant (schéma natif observé) et parent.info.variant (historique). Pour la preuve héritée et l’indisponibilité, au moins un champ parent doit être valide ; tous ceux présents et assistant.info.variant doivent être cohérents. Le prévol natif V2 unique décrit ci-dessous suit sa branche explicite, sans remplir le parent. Les formes historiques sans champ assistant restent lisibles. Une contradiction, valeur invalide ou absence de variante parent refuse la preuve. Les gardes de session, répertoire, parent, modèle, fournisseur, date, finish stop et absence d'outil restent applicables. Les erreurs auth/quota/réseau ne deviennent jamais des preuves de raisonnement indisponible.

Les anciens jobs sans logicalProviderID restent valides. Après armement d'un nouveau job portant ce champ, un lecteur strict 1.10.2 n'est pas qualifié pour ce contrat : conserver le lecteur compatible et les preuves plutôt que restaurer une sauvegarde métier. La préparation et le paquet source n'activent aucune configuration ou reprise.

## Preuve native V2 à échange unique — 2.1.28

La lecture paginée fixe order sur la première page uniquement. Le curseur opaque porte ensuite son ordre ; les limites et refus de pages invalides ou répétées restent appliqués.

Pour le prévol natif, le client marque sa provenance seulement après lecture complète d’un transcript contenant exactement un utilisateur précédant un assistant. Si le parent omet modèle et variante, le vérificateur peut employer le modèle et la variante exacts de la réponse native, avec identités, dates, texte, fin stop et absence d’outil contrôlés. Aucun champ n’est ajouté au parent. Une métadonnée entrante ne peut pas établir cette provenance. Plusieurs échanges, un modèle parent partiel ou contradictoire et les preuves incomplètes restent refusés. Les preuves héritées et leur cohérence parent/assistant restent vérifiées ; les erreurs de raisonnement sans preuve native suffisante n’autorisent aucun repli.

## Priorité medium puis high — nouvelles sessions et reprises

Pour une nouvelle session ou une reprise autorisée, converger vers `medium`
lorsqu’il est réellement publié et disponible sur le modèle retenu. Se
replier sur `high` seulement si `medium` est absent, désactivé ou rejeté par
une preuve native d’incompatibilité. Une erreur réseau, de quota ou
d’authentification ne prouve pas cette indisponibilité. Un niveau explicitement
imposé par le développeur reste prioritaire. Prévoler exactement le choix
avant de générer un mandat.

Une reprise historique en `high` réexamine donc `medium`, sans conserver
`high` par simple habitude. Préserver fournisseur/modèle, RUN, job, réservations,
mandats et preuves ; préparer la transition à une frontière autorisée, vérifier
la variante native et réconcilier le choix durable du contrat. Ne pas réarmer
un job ni écrire manuellement son état pour forcer la convergence. Si le contrat
courant ne permet pas une transition sûre ou si son prévol manque, signaler
la limite et conserver le contexte sans annoncer `medium` appliqué.

Cette règle de protocole ne déclenche ni benchmark PLLM de reprise, ni
changement des sessions actives lors d’une mise à jour des sources. La sélection
par défaut essaie `medium`, puis `high` sur la même candidate ; seulement en
cas d’indisponibilité des deux, la sélection automatique examine la politique
PLLM suivante. Un modèle imposé reste conservé si les niveaux admissibles ne
sont pas disponibles.


## Contrat des modèles du client V2 — CAB2.1.28

Les méthodes createSession, createProbeSession, prompt et switchModel attendent
`model = { providerID, modelID, reasoning: 'medium' }`. Le client sérialise
reasoning en variant pour l’API native. Une session relue expose en revanche
`session.model = { providerID, modelID, variant }` ; cet objet ne constitue pas
une entrée directement réutilisable.

Tout champ propre model.variant, même nul, indéfini ou accompagné de reasoning,
est refusé AVANT tout appel HTTP avec opencode-model-variant-unsupported :
« Le champ model.variant est réservé aux lectures natives ; utiliser
model.reasoning en entrée. » Le message ne recopie aucune valeur du modèle.
Il n’existe aucun alias ni choix de niveau implicite pour réparer cet appel.

Pour réutiliser explicitement la variante observée, préparer un nouvel objet :

```javascript
const { providerID, modelID, variant } = session.model;
const model = {
  providerID,
  modelID,
  ...(variant !== undefined ? { reasoning: variant } : {}),
};
await client.createProbeSession({ model });
```

Une entrée valide qui omet intentionnellement le niveau reste compatible avec
le client ; le protocole de choix de modèle continue à exiger ses propres
niveaux et prévols. Ne pas confondre cette compatibilité du transport avec une
autorisation de choisir default à la place du medium requis.

Après ce refus local, vérifier l’absence d’effet et préparer un appel conforme
dans son mandat. Ne pas changer implicitement le modèle du codeur, réarmer un
job ou rejouer une once. Une ancienne mesure obtenue en default lorsque medium
était demandé reste INVALID_CONFIGURATION, exclue des moyennes medium ; ne pas
réécrire ses preuves comme si elle avait utilisé le niveau attendu.


## Transition explicite ou retour à la PLLM

Lire [hot-model-switch.md](hot-model-switch.md). Le choix courant peut être remplacé dans le même job par POST /runs/<run_id>/job/model-transition, sans réarmement ni contrainte de la politique antérieure pour un choix explicite. Sans modèle explicite, la préparation suit la PLLM actuelle. L’historique conserve le choix réel précédent ou son absence ; aucune provenance passée n’est inventée. Le raccord du compte partagé et l’adoption de chaque job restent des opérations corrélées distinctes de CABU.
