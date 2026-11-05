# Conception

## Contexte

`request_validation` est transmis au contrôleur avant que l’appel MCP intérieur termine son wrapper Code Mode `execute`. Le transcript natif peut alors montrer ce wrapper `running` et son unique `toolCalls` courant, avec les arguments exacts déjà fournis au broker.

## Objectifs et exclusions

**Objectifs :** corréler uniquement cette frontière en cours à l’identité complète de la demande ; enregistrer l’admission avant la réponse du broker ; laisser les accès disjoints progresser sans lever un bail restauré.

**Hors objectifs :** accepter un wrapper `execute` inexploitable, autoriser une décision, une permission ou un `once`, modifier une ressource, réparer une opération historique, ou changer l’admission des accès recouvrants.

## Décisions

- Le contrôleur conserve ses chemins normalisés et terminaux existants. Il ajoute un chemin d’admission pour un wrapper `execute` natif `running` avec `executed=false`, `truncated=false`, un unique appel MCP `request_validation` lui-même `running`, et l’objet natif correspondant à l’identité complète reçue.
- Une unique recherche `search` terminée peut précéder l’appel. Tout autre appel, identité divergente, entrée incomplète, état terminal contradictoire ou wrapper exécuté reste refusé.
- L’admission ne transforme pas un accès restauré en blocage de toutes les demandes du RUN. Elle enregistre la demande et l’opération sous le RUN existant ; `/locks/acquire` reste responsable de l’ensemble atomique, et les conflits recouvrants attendent.
- Le codeur ne reçoit aucune nouvelle décision ou permission par cette corrélation. La décision manuelle, l’acquisition, ask/once, la fin native et la libération restent séparées.

## Risques et compromis

- **Métadonnées d’appel MCP partielles pendant l’exécution** → refuser tant que le tableau n’est pas présent, complet et borné, sans attendre en boucle ni enregistrer de propriétaire.
- **Wrapper avec un effet additionnel** → n’admettre qu’un appel unique, ou search exact suivi de l’appel unique ; refuser toute autre séquence. Aucun `once` n’est transmis avant décision et acquisition.
- **Bail déjà restauré** → le conserver ; seules les ressources disjointes sont admissibles et toute acquisition recouvrante reste soumise aux règles de conflit.

## Déploiement et retour arrière

Qualifier en fixtures isolées, archiver et publier 2.1.65, puis lancer CABU. L’updater conserve son reçu, ses sauvegardes et ses gardes. En cas d’échec, terminer le rollback ou réconcilier le même reçu avant toute nouvelle transaction ; ne pas rejouer une demande terminale.
