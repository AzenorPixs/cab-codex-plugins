# Admissions et persistance compatibles avec les droits projet — CAB2.2.7

## Why
Le chemin brut refuse completed/error=true avec request_validation completed,
alors que la corrélation porte sur l’input et non une réussite. Le résultat
NOT_ADMITTED du cas CISMP5 reste terminal ; son origine initiale n’est pas
attribuée sans reproduction de l’observation au moment de la notification.

## What Changes
Reconnaître cette forme cohérente, avec les mêmes gardes d’identité, provenance,
troncature et nombre d’appels, sans décision ou permission implicites.
Refuser explicitement la redélivrance d’un résultat natif NOT_ADMITTED corrélé.
Documenter la procédure canonique avec identités neuves après refus terminal.

## Impact
Contrôleur et tests HTTP, versions et documentation ; aucun RUN Pixs modifié.
Cycle SCM/incrément/publication/CABU sous mandat explicite du développeur.

## Contrainte développeur ajoutée
DIU peut remettre sans préavis tous les fichiers des projets en0775 ; ils
doivent conserver ce mode. Les états privés CAB ne doivent donc plus être
stockés sous le projet. Cette migration est nécessaire au même déploiement :
le contrôleur2.2.6 refuse déjà ses fichiers privés de projet en0775, et ne
peut pas produire le transfert ordinaire. CABU doit migrer sans modifier les
droits du projet, garder identités/décisions/once et tracer explicitement le
premier démarrage protégé, sans prétendre à un certificat source absent.
