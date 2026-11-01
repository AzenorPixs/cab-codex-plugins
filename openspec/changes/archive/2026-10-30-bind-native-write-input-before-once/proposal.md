# Lier l’entrée d’écriture native avant once

## Why

Une entrée write a divergé sémantiquement du contenu approuvé au même chemin ; le contrôle après écriture a détecté l’écart. Le développeur autorise la qualification et protection avant effet. CAB vérifie actuellement cible/commande et permission, sans empreinte des arguments natifs.

## What Changes

CAB2.1.22 ajoute tool_input_sha256 au mandat fichier, au stockage/retry/décision corrélés et à l’opération contrôleur. Le client calcule l’empreinte canonique des arguments depuis la partie native source vérifiée. Avant once, une différence ou une source non prouvée invalide l’exécution protégée sans consommer la permission. Les anciens mandats sans empreinte restent compatibles et explicitement non protégés par cette extension ; le protocole exige l’empreinte pour les nouvelles écritures/éditions. Contrôle du fichier final maintenu.

## Impact

Broker/copies, client V2, contexte contrôleur, tests positifs/négatifs et natifs, documentation/version commune, OpenSpec/Map/BATCH/statistiques. Même RUN/job/SID, mode2 et OpenCode préservés. SCM puis CABU et information des propriétaires ; aucune correction du fichier métier par CAB. Code non attribué, attribution ACL ultérieure.
