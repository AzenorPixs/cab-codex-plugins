# Qualifier input omis pour broker_readiness vide

## Why

Un appel natif Code Mode broker_readiness({}) achevé peut omettre input dans son unique métadonnée toolCalls ; la comparaison actuelle undefined/{} conserve alors execute bloquant. Le développeur autorise ce seul correctif sous SCM, incrément de version, CABU et information des sessions.

## What Changes

CAB2.1.23 reconnaît cette seule omission pour un retour direct d’appel littéral vide, unique, réussi, achevé et non tronqué. Aucun défaut générique d’arguments, null, input explicite divergent, autre outil ou découverte combinée n’est assimilé à{}. Provenance et empreinte de l’enveloppe brute sont conservées ; aucune autorité de décision/once nouvelle.

## Impact

Client V2, tests adversariaux et banc natif2.2.0 ; procédure distribuée, skill/commande, versions communes ; OpenSpec/Map/BATCH/statistiques, publications et CABU. Aucun RUN, mandat, modèle, credential ou historique modifié par la qualification. Code non attribué, attribution ACL ultérieure.
