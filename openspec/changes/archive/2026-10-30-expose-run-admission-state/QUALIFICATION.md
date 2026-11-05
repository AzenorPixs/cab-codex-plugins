# Qualification — CAB2.1.24

## Observations et refus

Le Set transitions et son périmètre de sérialisation restent inchangés. Le statut du RUN et un nouveau GET ciblé exposent un instantané BUSY/STABLE avec snapshot_only:true ; propriétaire, validation et décision locale enregistrés sont des faits distincts. Les GET ne font pas d’appel natif et ne réservent aucune admission. Les requêtes inconnues sont404 explicites ; une cible étrangère est refusée409 sans lire sa décision.

Le409 précoce d’une décision pendant transition ajoute message/admission et decision_recorded local (ounull si demande inconnue). Le400 tardif existant conserve statut/code/decision_recorded et ajoute admissionBUSY. Aucune attente serveur, retry, mutation de décision ou transmission de once n’est ajoutée. Les autres routes/refus et les corpsGETdecision existants restent inchangés.

## Qualification ciblée

Quatre tests ciblés réussis : transition maintenue par un reminder, étatBUSY observé avec propriétaire/validation connus, décision refusée409 sans effet, RUN voisin disponible ; stabilisation puis décision unique sur même identité, doublon refusé et première décision intacte. Cas inconnus/étrangers et lectures sans mutation du registre. Course tardive : STABLE observé puis transition pendant vérification native,400 encore refusé sans décision. Révision périmée malgréSTABLE : garde de révision conservée. Aucune borne ou assertion n’est relâchée.

## Vérifications finales

Node134/134 concurrent (33,284580s) et479réussis/30ignorés sur509autres (54,850422s), soit643cas uniques et613réussis,0échec. Python81/81 (4,685s). Trois bancs natifs exact2.2.0 explicites3/3 (14,341689s), distincts des ignorés par défaut ; contrôles de contenu avant once, readiness vide, recovery et contexte portable conservés. Ciblés inclus dans le global, aucune addition de leur répétition. Syntaxe66JS/16Python, copies broker identiques, UTF-8/LF et quatre empreintes protégées préservées. OpenSpec avant archive17/17 standard/strict et cible stricte valide ; après archive dans PREUVES-SCM.json.

Session SCM directe, aucun sous-agent ou test fournisseur réel. Aucun template, AGENTS, DEVOPS, ORCHESTRATED_CODING ou concurrent-runs modifié. Source, archive, publication, CABU puis adoption des observations sont distincts. Codes de lot non attribués, références de sous-lots provisoires maintenues ; statistiques globales existantes reconstruites sans modification des rapports historiques. Les preuves régénérables sont sous output/admission-state.
