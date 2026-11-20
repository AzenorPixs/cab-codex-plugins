---
name: cicdf
description: Livrer par CAB l’intégralité des fichiers admissibles modifiés ou indexés du projet sur mandat CICDF explicite.
---

# CICDF 3.4.0

Utiliser ce parcours sur demande explicite de CICDF ou de livraison de tous les changements du projet. Le périmètre comprend le dossier de travail, l’index commun et les index de session actifs du projet, y compris les fichiers hors du change courant. CAB fige les fichiers admissibles avant de modifier la version et refuse les conflits d’index ou les effets concurrents incertains. Les fichiers protégés restent exclus.

Appliquer les règles du skill `cicd` pour le choix de version, le rattachement au RUN, le suivi et la clôture. Appeler `session_delivery_full_start(version)`. Lire ensuite `session_delivery_status(version)` sur le même reçu. Le champ `scope` doit valoir `project`. Une réponse perdue se vérifie sur le reçu existant. Le codeur ne reproduit aucun commit, build ou envoi.

CAB construit les artefacts Debian et Docker activés. Leur publication reste assurée par DIU. Indiquer les étapes réellement vérifiées et les publications différées.
