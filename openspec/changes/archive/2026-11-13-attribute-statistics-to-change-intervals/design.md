# Périodes statistiques par change

Chaque période référence Change, Run et CodingSession. Un seul contexte ouvert
par CodingSession est garanti en SQL ; l’identité complète reste projet, agent,
UID et SID. Un change agrège plusieurs RUN et sessions distincts. Un début de
mesure ferme atomiquement la période précédente du même SID au même instantané,
puis ouvre la suivante. La bascule ne suspend aucun RUN et ne demande aucun aval.

Les bornes serveur début/fin et les bornes natives observées sont conservées.
Les compteurs cumulatifs ne sont jamais additionnés : seuls les écarts entre
instantanés compatibles d’une période sont admissibles. Source remplacée,
compteur réinitialisé, champ absent ou source indisponible donne N/A.
Les écarts sont des compteurs natifs observés entre barrières ; aucune répartition
à l’intérieur d’un événement natif ni durée de requête manquante n’est inventée.
Les événements natifs tardifs et leur couverture restent explicites.

Début/fin acceptent request_id stable : reprise d’un reçu sans réouvrir une
période fermée. Gel/clôture ferment seulement le contexte du RUN concerné.
Les RUN anciens ne reçoivent aucune période rétroactive ; leurs anciens métriques
gardent leur origine session-wide et sont exclus de l’export par change.
Le codeur indique from_coding_start=true au premier début seulement s’il précède
effectivement le codage. Sans cette attestation pour chaque RUN lié au change,
l’export conserve les mesures des périodes mais laisse les totaux SGS inconnus.

Le collecteur conserve les instantanés de session comme diagnostic ; les API de
statistiques et l’export SGS utilisent exclusivement les périodes propres au
change. Les champs non observables restent inconnus, pas zéro. La durée active
est l’union temporelle des périodes, sans addition des temps simultanés.
Un export fournit contribution SGS, périodes et empreintes vérifiables, sans
prompt ni contenu de conversation. Les intégrations enseignent le parcours.

Livraison3.0.6 par DIU/CABU, compatibilité des identités, reçus et sessions actives.

## Correctif de qualification3.0.7
L’essai réel3.0.6 a révélé un ancien journal du même SID : la reprise Codex utilise
un chemin suffixé enregistré dans l’index natif. La résolution consulte ce seul
SID dans le dernier index compatible, sous l’UID du codeur et en lecture seule.
La reprise resume=true exige RUN en travail non gelé, aucun effet ni période
ouverte ; index courant et ancienne liaison vérifiés, historique borné128, sans
changer SID/RUN/génération. Les compteurs anciens et horloges natives non
compatibles donnent N/A, y compris en lecture de périodes préexistantes.
