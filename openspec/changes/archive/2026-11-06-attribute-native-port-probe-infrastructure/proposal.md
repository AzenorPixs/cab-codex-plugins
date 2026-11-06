# Attribution de l’infrastructure native dans les sondes de port

Code non attribué ; convergence ACL ultérieure. Correctif borné de la
réconciliation C12 demandée, dans le mandat SCM de correction et poursuite.

## Why
La sonde 2.3.3 compte les ancêtres du serveur OpenCode et son client interactif
comme candidats du workspace, bloquant la qualification d’un port libre.
Le diagnostic natif du 6 novembre atteste les PID 10859/10910, serveur10912
et client10931, leurs startTime, filiation et connexion TCP réciproque.

## What Changes
- Distinguer les ancêtres natifs stables du même compte et namespace.
- Distinguer un client interactif uniquement par exécutable identique, parent
  commun, même terminal et connexion TCP loopback appariée au serveur attesté.
- Exposer PID/startTime/PPID/comm et cwd relatif bornés, sans cmdline/environ.
- Conserver toute identité ambiguë comme candidat ou couverture incomplète.
- Tests de faux positifs et vrais processus ; références skill/plugin/commande,
  spécifications, cadrages et versions couplées en2.3.4. SCM, archivage, SGS,
  commit/publication DIU puis CABU et coordination C12.

Aucune suppression de processus, nouvelle autorité, permission, once rejouée,
réinterprétation de capture2.3.3 ni levée de quarantaine par le correcteur.
Le dépôt était propre à3d9dfad6 ; aucun travail tiers à inclure. Aucun nouveau
stockage privé ; repli source avant activation, reprise en avant après CABU.
