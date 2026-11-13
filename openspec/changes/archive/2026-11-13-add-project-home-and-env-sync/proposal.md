# Accueil projet et synchronisation project.env

Code non attribué ; attribution ACL ultérieure. Périmètre autonome validé par
le développeur le 13 novembre 2026, session SCM avec livraison CI/CD DIU.

## Why
La racine du projet affiche les sessions sans présenter ses métadonnées.
Le fichier project.env doit devenir la source de ces informations publiques.

## What Changes
- Accueil à /projects/<ID>, destination de la sélection et de la maison ;
  sessions déplacées à /projects/<ID>/sessions.
- Nom, version et étiquettes PROJECT_TYPE ; cartes conditionnelles des forges.
- Instantané public dans projects, lecture sûre à la sélection, surveillance
  externe et propagation Electric autorisée.
- Tests, documentation, archivage et livraison DIU ; aucun secret projeté,
  aucun changement direct de project.env ni changement des identités CAB.

## Impact
Frontend React/TanStack, domaine Django, migration additive et publication
Electric d’une table publique dédiée uniquement. Les liens de sessions doivent
utiliser /sessions ; incidents, archives et détails RUN conservent leurs URL.
