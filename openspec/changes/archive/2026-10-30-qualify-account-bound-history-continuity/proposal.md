# Qualifier la continuité chiffrée et corriger le lanceur

## Why

Après le raccord2.1.19, la sonde fraîche fonctionne mais la session historique reçoit400 encrypted_content non émis pour ce compte. La demande de remédiation dans le mandat du raccord à chaud autorise qualification/correction et CABU, avec conservation SID/historique ; si2.2.0 ne le permet pas, une limite démontrée est attendue. Un défaut indépendant confirmé empêche aussi le helper de s’exécuter via son lien installé.

## What Changes

Version commune2.1.20. Corriger la détection de main par chemin canonique et tester le vrai lien symbolique. Qualifier sur un banc privé Responses2.2.0 l’historique synthétique lié au compte, la différence sonde fraîche/continuité, le sens natif de resume:false et les parcours supportés sans effacement, nouveau SID ou édition de stockage. Ajouter aux résultats d’adoption une indication explicite que la continuité historique reste à vérifier, puis documenter la procédure ou la limite réellement démontrée. Aucun mécanisme de contournement arbitraire ou modification d’OpenCode hors périmètre.

## Impact

Helper CLI, résultat du modèle de transition, tests unitaires/CLI/natifs, références et cadrages, versions communes. Source OpenSpec avant code, archivage/statistiques/publications puis CABU après qualification. Aucun contenu chiffré réel, compte, modèle ou historique des RUN réels inspecté/modifié. Aucun compactage, resume:false, dispose, nouveau SID ou réévaluation PLLM appliqué sur ces RUN. Aucun nouveau code de lot, attribution ACL ultérieure.
