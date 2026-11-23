# Mandat correctif CCAB et fichiers préexistants autorisés

Code non attribué ; attribution éventuelle par ACL, sans bloquer ce correctif.

## Pourquoi

L'invocation explicite de CCAB autorise déjà, selon la décision du développeur,
les correctifs CAB nécessaires sous SCM avec CICD. Les sources distribuées
doivent l'indiquer pour éviter de redemander ce mandat à chaque incident.

Template a autorisé l'inclusion de DEVOPS.md, mais son RUN natif possède déjà
une baseline : l'adoption legacy ne lui est pas applicable et la réservation
refuse le fichier préexistant. Un autre RUN conserve aussi un ancien statut
dirty alors que les modifications correspondantes sont désormais publiées.

## Changements

- Expliciter le mandat d'invocation dans le plugin, le skill, la commande et
  le contrat CCAB, sans étendre les mandats métier des projets déclarants.
- Fournir une inspection et une autorisation administratives des seuls
  fichiers réguliers préexistants explicitement approuvés, par CAS et reçu.
- Conserver la baseline initiale, les critères, les preuves et l'index ;
  la réservation suivante reste une opération native du codeur.
- Reconnaître automatiquement un ancien statut dirty lorsque le fichier
  actuel correspond réellement au blob et au mode du HEAD courant.

## Impacts et validation

API de commandes, réservation Git, documentation et distribution CCAB.
Aucune migration, dépendance ou modification de project.env par le LLM.
Qualification PostgreSQL/Git sur fixtures, contrôles de syntaxe et OpenSpec,
livraison SCM/CICD 3.2.22 et activation CABU, puis vérification Template/Bis.
L'archivage de l'implémentation ne prouve pas ces étapes externes.
