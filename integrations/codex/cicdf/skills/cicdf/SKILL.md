---
name: cicdf
description: Livrer par CAB l’intégralité des fichiers admissibles modifiés ou indexés du projet sur mandat CICDF explicite.
---

# CICDF 3.5.0

Utiliser ce parcours sur demande explicite de CICDF ou de livraison de tous les changements du projet. Le périmètre comprend le dossier de travail, l’index commun et les index de session actifs du projet, y compris les fichiers hors du change courant. CAB fige les fichiers admissibles avant de modifier la version et refuse les conflits d’index ou les effets concurrents incertains. Les fichiers protégés restent exclus.

Appliquer les règles du skill `cicd` pour le choix de version, le rattachement au RUN, le suivi et la clôture. Appeler `session_delivery_full_start(version)`. Lire ensuite `session_delivery_status(version)` sur le même reçu. Le champ `scope` doit valoir `project`. Une réponse perdue se vérifie sur le reçu existant. Le codeur ne reproduit aucun commit, build ou envoi.

Sur un RUN régi par le protocole des étapes, annoncer la Publication et
appeler `run_stage_begin` à l’étape 11 avec la version et `scope="project"`.
Lire le même lancement via `run_stage_status`. Une fois les retours CAB
réussis, valider la part de l’agent et poursuivre en Clôture. Pour un RUN
historique, utiliser le démarrage CICDF de session documenté plus haut.

Pour un RUN à douze étapes, appliquer le skill **Version** après la
spécification. Le codeur choisit puis appelle `version_propose` après
l’accusé du lecteur habilité. En piloté, l’orchestrateur déclare le
numéro choisi par le codeur. Les RUN historiques gardent leur parcours.

CAB construit et publie les artefacts Debian et Docker activés par ses fonctions natives. Indiquer les étapes réellement vérifiées et les publications différées.


## Effets de session et reprise après commit

Le moteur CAB réalise Git, la génération et la publication des artefacts. Le LLM
déclare l'intention et traite les exceptions ; il ne reproduit pas les commandes
Git, les empreintes ni les boucles de suivi du service.

Avant les tests finaux et tout start, appeler `session_version_prepare` avec la
version retenue et un request_id stable. CAB aligne ses versions publiques,
réserve les chemins nécessaires et exige une nouvelle qualification. Le prévol
refuse une version désalignée avant commit, tag ou envoi.

Pour une opération ponctuelle, `session_effect(action="authorize")` enregistre
l'autorisation explicite du développeur et la nature exacte : `commit`,
`build:debian`, `build:docker` ou `publish:FORGEJO`/`publish:GITHUB`/`publish:GITLAB`.
En direct, le propriétaire la porte ; en piloté, l'orchestrateur l'enregistre et
le codeur utilise son approval_id. Puis `action="request"`, `mode="requested"`,
avec cet approval_id, la version et un nouveau request_id. Un commit ponctuel
ne crée ni tag ni publication implicite. Les fichiers restent qualifiés/indexés.

Après un échec connu du parcours, `mode="recovery"` lie la nouvelle tentative
à la livraison et à son étape FAILED. CAB conserve l'ancien reçu. Après un
commit déjà publié, `action="open_recovery"` conserve delivery_id, RUN et version,
avec l'autorisation développeur et scope="project" seulement sous mandat CICDF.
Corriger et qualifier les sources ; `kind="resume"`, `mode="recovery"` reprend
ensuite cette même livraison avec un commit supplémentaire et des leases exactes.
Aucun nouveau start/version/RUN ne remplace une livraison partielle.

`request` capture lui-même le CAS et suit mécaniquement le résultat pendant une
attente bornée. `inspect` est facultatif, utile au diagnostic ; le LLM n'a pas à
transporter le snapshot. Si l'attente dépasse ce délai, `action="status"` relit
le même request_id. UNKNOWN reste protégé, sans rejeu. Une réussite technique
n'efface pas les échecs antérieurs et ne vaut pas activation CABU.


### Remédiation avant reprise

Un échec de build suit diagnostic → remédiation → qualification → reprise.
`session_effect(action="diagnose", args={delivery_id})` expose des causes et
remédiations structurées, sans sortie brute du processus. Après open_recovery,
`action="remediate"` prépare les versions publiques nécessaires et retourne
SOURCE_QUALIFICATION_REQUIRED. `request(kind="resume", mode="recovery")` déclenche
aussi cette préparation automatiquement si elle manque ; si elle modifie les
sources, il rend la main pour leur qualification, avant toute nouvelle tentative.
Un manque de dépendance ou un défaut de source non corrigé reste explicitement
à traiter. Le moteur n'installe pas de dépendance nouvelle ni ne rejoue UNKNOWN.
Le suivi natif constate aussi un arrêt du worker, avec reçu conservé.

Une reprise de build sans changement de source réutilise le commit existant.
Une reprise du commit FAILED est permise au propriétaire du RUN et conserve
les reçus de la tentative précédente. Les commandes Git restent dans CAB.
