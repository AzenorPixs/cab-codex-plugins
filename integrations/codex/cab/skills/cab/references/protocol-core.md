# Contrat CAB 3.2.7

Le service système est l’autorité transactionnelle. Vérifier cab_status puis
cab_contract. Direct : aucun orchestrateur fictif. Piloté : cadrage initial et
choix résolus, autonomie du codeur sur réalisation, tests et coordination,
sollicitation du parent limitée aux quatre exceptions et à la revue finale.

Toutes les écritures API passent par Django ; Electric est un chemin de lecture
filtré au projet. Les reçus lient request_id, SID/RUN, génération et sources.
Après une réponse perdue, consulter ; ne jamais rejouer un effet UNKNOWN.
La revue finale accepte les preuves de tests sur la source inchangée avant
publication. Un autre projet ou une décision imprévue exige l’exception cadrée.

Le codeur déclare l’étape1–11 et la phase via run_progress à l’entrée et aux
changements d’étape, à la frontière d’un lot utile. Ce pointage ne sollicite
pas le parent et n’est pas une validation. Les tâches sont des observations de
tasks.md mémorisées par change ; aucune réussite du RUN ne s’en déduit.

## Git par session et livraison

Le service capture l'état Git initial du change dans git_changes ; une reprise
conserve cette capture. Les réservations portent sur des chemins littéraux du
mandat, avant modification. Elles sont coopératives : un éditeur extérieur au
protocole peut les contourner. Un fichier préexistant ou réservé par une autre
session n'est pas attribué implicitement. Les appels sont groupés pour limiter
les échanges : réserve avant l'étape, indexe après sa validation, consulte le
reçu en cas d'interruption. L'index isolé et ses références internes restent
conservés après archivage jusqu'à la livraison confirmée.

Une session native peut intervenir sur un autre projet uniquement par une
autorisation administrative persistée, révocable et bornée au RUN, à son projet
cible et aux chemins autorisés. Le journal natif d'origine et le SID restent
inchangés. Aucun nom de projet n'est imposé dans le moteur.

Le skill CICD utilise les outils session_delivery_start et
session_delivery_status. Un résultat COMPLETED ne transforme pas une release
SKIPPED en publication : présenter les étapes effectivement exécutées et leur
résultat. Les builds DIU opèrent sur le projet courant, qui peut inclure des
modifications postérieures au commit. L'installation relève séparément de CABU.

## Clôture Git obligatoire

Les nouveaux RUN attendent la publication du dernier snapshot de métadonnées :
STATISTICS.md du change, STATISTICS.md global et BLOCKERS.md pour une sortie
bloquée. CAB indexe immédiatement ces documents et conserve un reçu du commit
et de chaque forge. Le code non validé et les réservations étrangères ne sont
pas absorbés. Une sortie bloquée ne vaut pas réussite et ne ferme pas le change.
Les anciens RUN nécessitent une habilitation explicite ; leurs preuves et
mandats ne sont pas migrés silencieusement. Le commit final est exécuté par CAB,
pas par le LLM. Une réponse perdue impose la lecture du même reçu, sans rejeu.

Versions du projet, tags de version Git, tags et versions de release sont
produits sans v. Le défaut est PROJECT_VERSION ; une nouvelle version transmise
prime sur ce défaut. La compatibilité de lecture des anciens tags ne constitue
pas une autorisation d'en créer de nouveaux avec ce préfixe.

Pour une nouvelle livraison, la sélection du numéro incombe au LLM de codage
en direct et à l'orchestrateur en piloté, suivant le versionnement du projet.
Ne pas redemander au développeur une version absente : exercer ce discernement,
sauf choix contradictoire réellement non résolu. Une version imposée prime.
En piloté, l'orchestrateur utilise `session_delivery_select_version` ; le service
refuse la livraison du codeur sans cette déclaration ou avec un autre numéro.
