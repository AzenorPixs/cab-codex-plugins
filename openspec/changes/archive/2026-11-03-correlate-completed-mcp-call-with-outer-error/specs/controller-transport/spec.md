## ADDED Requirements

### Requirement: Corréler une requête MCP terminée sous erreur du wrapper
Le contrôleur SHALL pouvoir corréler un wrapper Code Mode brut dans une phase connue running/completed/error, même avec metadata.error=true,
et un appel request_validation natif de phase connue, seulement si la
provenance native et l’identité complète concordent, sans troncature ni outil
supplémentaire non autorisé. Cette corrélation SHALL ne créer aucune décision,
aucun accès ni aucune permission implicite.

#### Scenario: Erreur externe et appel MCP terminé cohérents
- **GIVEN** une demande neuve PENDING dont le wrapper porte error=true et l’appel MCP completed
- **WHEN** l’input natif exact et toutes les gardes d’admission concordent
- **THEN** seule la demande peut être admise, sans décision ou once

#### Scenario: Réponse terminale ou preuve divergente
- **GIVEN** un résultat natif NOT_ADMITTED de la même identité, une entrée divergente, une troncature ou un appel exécutant supplémentaire
- **WHEN** une admission est sollicitée
- **THEN** elle est refusée sans réactiver la demande terminale

#### Scenario: Mise à jour asynchrone des phases connues
- **GIVEN** un wrapper et un appel MCP en phases connues running/completed/error, avec marqueur error absent ou booléen
- **WHEN** leurs mises à jour sont décalées mais l’input natif exact est attesté et aucun résultat terminal interdit n’est observé
- **THEN** la corrélation ne dépend pas de leur synchronisation et ne crée aucune autorisation

### Requirement: Attendre une preuve native temporairement invisible sans clore la demande
Le contrôleur SHALL distinguer une preuve absente/partielle d’une contradiction.
Il SHALL observer au plus quatre snapshots dans une fenêtre de750ms, sans
requête native nouvelle. Une absence persistante SHALL retourner503
native-validation-evidence-unavailable et conserver PENDING ; une transition
de RUN SHALL rester transitoire. Les lectures gardent leurs timeouts natifs.
Une contradiction ou un résultat terminal interdit SHALL rester refusé.

#### Scenario: Persistance du transcript retardée
- **GIVEN** une notification légitime avant visibilité de son tool part
- **WHEN** la preuve apparaît pendant la fenêtre ou une renotification du même identifiant
- **THEN** elle peut être corrélée sans nouvelle demande, décision ou permission

#### Scenario: Diagnostic au moment du POST
- **GIVEN** une observation d’admission
- **WHEN** le propriétaire lit GET validation/correlation avec son requestId
- **THEN** il obtient phases, compteurs et noms de champs manquants/divergents, sans commande, secret ou token ; une absence retenue ne prouve aucun effet

### Requirement: Isoler les états privés des droits des fichiers projet
Les états privés du contrôleur et du superviseur et les reçus locaux SHALL
résider sous le profil d’exécution, hors projet, avec répertoires0700 et
fichiers0600. Les fichiers de projet SHALL ne pas être remis en0600 pour CAB.
Le root optionnel OC_Codex_RUNTIME_STATE_ROOT SHALL être absolu et hors projet.
Le broker conserve son stockage de profil déjà hors projet par défaut.

#### Scenario: Rejeu DIU en0775
- **GIVEN** les fichiers du projet normalisés en0775
- **WHEN** CAB persiste une validation ou une décision
- **THEN** il écrit son état privé hors projet et ne change pas le mode des fichiers du projet

### Requirement: Migrer le runtime historique sans réémettre de mandat
CABU SHALL vérifier les copies privées, conserver RUN/job/SID, décisions,
once et protections incertaines, et laisser les fichiers historiques inchangés.
La migration SHALL être distinguée du transfert certifié source. Elle SHALL
préserver les validations actives attestées par source/registre/transcript.
Le nouveau contrôleur SHALL suspendre ses mutations et permissions jusqu’à
vérification et activation idempotente du reçu, sans réémettre de mandat.

#### Scenario: Checkpoint de projet refusé en0775
- **GIVEN** un contrôleur historique avec PENDING durable et persistance privée indisponible
- **WHEN** les identités et copies sont vérifiées puis la nouvelle instance privée est activée
- **THEN** la même demande reste décidable sans replay, sans perte de once et sans changement de droits projet

#### Scenario: Copie ou identité divergente
- **GIVEN** un lien, un fichier divergent, une identité native changée ou une copie incomplète
- **WHEN** la migration est demandée
- **THEN** elle conserve les preuves et ses protections, sans fusion ou autorisation inventée

## MODIFIED Requirements

### Requirement: Corrélation d’un appel Code Mode de validation en cours

Le contrôleur MUST corréler un appel `request_validation` natif unique visible dans un wrapper Code Mode `execute` en cours seulement si ses identités et métadonnées exactes sont présentes. Cette admission MUST NOT créer de décision, permission ou `once`, et MUST NOT être bloquée par un accès restauré sur des ressources disjointes du même RUN.

#### Scenario: Appel exact en cours avec ressource disjointe

- **WHEN** `execute` est `running`, `executed=false`, non tronqué, et porte comme seul appel MCP courant `request_validation` `running` dont l’identité complète correspond, alors qu’un accès restauré `HELD` vise une ressource disjointe
- **THEN** CAB admet et enregistre la demande exacte sans refuser sur cet accès disjoint
- **AND** l’accès restauré reste `HELD` et aucune décision, permission ou `once` n’est créée
- **AND** toute acquisition ultérieure reste atomique et un ensemble recouvrant attend

#### Scenario: Recherche exacte avant validation

- **WHEN** l’unique `request_validation` courant correspond exactement et est précédé d’une unique recherche `search` terminée, sans autre appel
- **THEN** CAB admet la demande avec les mêmes gardes d’identité et d’absence d’autorité implicite

#### Scenario: Wrapper actif incomplet ou divergent

- **WHEN** le wrapper est tronqué, exécuté, sans métadonnées complètes, avec phase native inconnue, appels supplémentaires ou identité native divergente
- **THEN** CAB refuse la demande avant d’enregistrer propriétaire, validation ou décision

#### Scenario: Appel recouvrant après admission

- **WHEN** la demande exacte a été admise mais l’ensemble demandé recouvre un accès `HELD`
- **THEN** aucune acquisition partielle ou permission native n’est créée et l’acquisition attend la résolution du conflit

#### Scenario: Call terminé alors que le wrapper demeure en cours

- **WHEN** l’input natif exact est attesté dans une phase connue, mais le call MCP est completed et le wrapper encore running
- **THEN** la corrélation reste possible sans décision, accès ou once implicite
