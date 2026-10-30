# Adoption du modèle et continuité historique — CAB2.1.20

## Portée des preuves

Une nouvelle clé connectée, une sonde neuve réussie et une transition de modèle
completed ne prouvent pas que l’historique antérieur peut être rejoué au nouveau
compte. L’API de transition2.1.20 retourne historicalContinuity:not-verified et
requiresHistoricalContinuityCheck:true : completed atteste le choix natif et le
contrat, pas la portabilité de tous les états opaques d’une conversation.
Une preuve historique déjà obtenue pour le même état reste une preuve externe
du propriétaire ; ces champs ne la révoquent pas et ne demandent pas son rejeu.

Avant RESUME et tout mandat métier, le propriétaire conserve PAUSE/checkpoint,
permissions deny et absence d’outil/effet en cours, puis exige un échange natif
texte seul dans la SESSION HISTORIQUE. Ne pas remplacer ce contrôle par une
sonde neuve ou une simple relecture du modèle. Relire seulement les métadonnées
utiles (fin, erreur filtrée, modèle/niveau, présence d’outils) sans afficher ou
examiner les données chiffrées. Conserver les décisions, anciennes once,
écritures et contrôles déjà acquis ; ne pas rejouer un outil pour tester.

## Limite native2.2.0 démontrée

Le banc privé2.2.0 avec un fournisseur Responses local émet des métadonnées de
raisonnement SYNTHÉTIQUES liées au compte A. Après passage au compte B, la sonde
fraîche du même modèle réussit ; la session historique renvoie400 parce que les
anciennes métadonnées sont encore envoyées. Les mêmes SID/PID et les anciens
messages restent conservés. Aucune donnée chiffrée réelle n’a été inspectée.

La conversion native2.2.0 réutilise les métadonnées quand providerID et modelID
sont identiques, sans distinguer le compte. Le contrat HTTP examiné ne propose
pas de paramètre permettant d’invalider seulement ces métadonnées en maintenant
ce fournisseur/modèle et cet historique : Model.Ref expose fournisseur/modèle/
variante, context est en GET, et le patch de configuration HTTP ne modifie que
shell. Cette constatation porte sur le périmètre natif HTTP qualifié ; elle
n’affirme pas qu’une architecture ou configuration additionnelle serait déjà
qualifiée ou autorisée.

resume:false admet un message mais ne lance pas la génération. Sur le banc,
le prochain échange normal rejoue encore les métadonnées et échoue : ce n’est
pas un effacement ni une réparation du contexte. Ne pas l’utiliser comme tel.
Un changement transitoire vers un autre modèle puis retour au modèle d’origine
ne répare pas non plus : le retour réintroduit les anciennes métadonnées.
Aucun dispose, nouveau SID, compactage, édition de stockage ou suppression de
raisonnement n’est proposé comme réparation implicite.

## Projection native qualifiée et conditions de reprise

En CAB2.1.21, appliquer prioritairement [portable-context.md](portable-context.md) : un hook natif ciblé retire les anciens blocs et métadonnées de la seule requête, sans changer modèle/SID/PID ni historique enregistré. Le banc exact qualifie ce parcours ; la preuve historique réelle reste obligatoire. La limite précédente concerne le contrat HTTP seul, avant cette extension. Un autre modèle n’est pas nécessaire pour résoudre ce cas.

## Choix explicite distinct

Sur ce banc SANS outils, un autre modèle explicitement choisi fonctionne dans
le même SID, conserve les enregistrements historiques et reçoit le checkpoint
texte antérieur sans les métadonnées liées à l’autre modèle. Ce parcours n’est
pas une qualification automatique de tous les historiques réels, notamment
ceux ayant d’autres modèles ou outils antérieurs. Son propriétaire doit
valider la cible, son prévol et le contrôle historique réel sous deny avant
reprise. Il ne s’agit ni d’une bascule temporaire ni d’une déclaration que le
modèle initial serait indisponible.

Sans nouveau choix explicite, conserver la PLLM actuelle : cette erreur de
contexte n’est pas une incompatibilité de medium, un quota ou une raison de
relancer PLLM. Si le choix automatique courant reste incompatible avec les
états opaques antérieurs, garder la frontière et rapporter la limite avec les
conditions d’une décision de cible explicite ou d’une évolution native
spécifiquement autorisée/qualifiée. Aucune mise à niveau OpenCode ou création
d’alias/configuration/routage supplémentaire n’est déduite du correctif CAB.

## Lanceur installé et preuve d’effet

Le helper provider-connect2.1.20 reconnaît son chemin réel même quand il est
lancé via le lien installé vers une release gérée. L’import en bibliothèque
reste sans effet. Les tests emploient chemins canonique et lié avec pipe
secret privé et un seul POST par transaction.

Un exit0 seul ne prouve aucun raccord : exiger le reçu COMPLETED et la connexion
opaque attendue. Après l’ancien défaut d’entrée CLI, une nouvelle identité
n’est admissible que si absence de reçu/verrou/nouvelle connexion et absence
d’effet sont établies. Après possibilité d’effet, conserver le même reçu et
réconcilier sans réinjecter la clé, selon hot-model-switch.md.
