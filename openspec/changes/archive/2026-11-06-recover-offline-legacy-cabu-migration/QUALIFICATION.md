# Qualification source — CAB2.3.5 — 6novembre2026

## Résultats observés
- Node complet :1387cas,1355PASS,1échec EADDRINUSE du banc d’arrêt,31SKIP.
- Reprise isolée de ce banc :6/6PASS, sans modification du code produit.
- OpenCode réel isolé :1/1PASS, exécute un des cas SKIP de la campagne.
- Python :193/193PASS. Lecture des véritables artefacts du tag v2.3.3 et
  reprise isolée du même reçu vers cette cible historique :1/1PASS.
- Bilan final distinct :1551cas exécutés réussis,30SKIP ; aucune addition des
  campagnes répétées. Les104cas CABU passent dans la campagne générale.
- Syntaxe JS/Python :129fichiers ; OpenSpec strict22/22 avant archive.
- Empreintes figées dans output/scm-offline-cabu-migration/source-freeze.json.

## Cas couverts
Migration avec contrôleur2.2.6 répondant et depuis fichiers2.1.2 indisponibles ;
validation du registre et des contextes avec le lecteur cible sans start ;
copie byte-exacte, sources0775 conservées et destination0600 ; décisionapproved,
once acquittée, opération/accessEXECUTING conservées ; second appel conforme.
Refus avant coupure pour schéma inconnu, job invalide, source changée et PID
natif divergent. Reprise du même reçu ROLLBACK_FAILED sans initialActive ancien,
avec observedActive faux prouvé ; artefacts stage/backup/installés ou activité
initiale invérifiables restent refusés. Un updater plus récent termine d’abord
la cible initiale et expose nextUpdateRequired, sans nouvelle transaction.
Un repli ne redémarre pas les services initialement arrêtés. Les diagnostics
readerFailureCode/rollbackFailureCode sont filtrés et les protections conservées.

## Sonde C12
Un test Linux réel fait échouer le code2.3.4 par créations de sockets API tiers
malgré une paire attestée stable. Le même test passe après correction. Les20cas
de sonde qualifient aussi les vrais candidats et les divergences de terminal,
exécutable ou connexion. Les identités restent scellées et au moins une paire
réciproque possédée aux deux observations est requise. La capture C12 antérieure
reste non qualifiée ; deux nouvelles sondes et la revue restent nécessaires.

## Incidents de qualification
Le premier banc renforcé a été refusé pour un SID synthétique invalide puis
pour mode0600 au lieu du0775 attendu. Fixtures corrigées, gardes inchangées.
Les helpers privés de ces essais ont été fermés ; aucune production touchée.
La première variante de test réseau volatile n’a pas reproduit le défaut ; la
variante à sockets persistants l’a reproduit puis a validé la correction.
La collision EADDRINUSE en campagne parallèle est gardée dans node-final.tap.

## Portée et limites
Logs autorisés ignorés : output/scm-offline-cabu-migration/, notamment
node-final.tap,python-final.log,shutdown-final.tap,native-final.tap,
historical-target.tap,volatile-port-before.tap et syntax.json.
La reprise de l’autre instance n’est pas exécutée ici : reçu, chemins et
identités devront être revérifiés sur place. Le correctif ne contient aucun
identifiant de reçu, projet ou machine ajouté en dur. Les garde-fous cab-source,
propriétaire, contexte, stage et sauvegarde demeurent. Après copie, reprise en
avant uniquement. SGS permanent et CCAB sont des évolutions distinctes.
Livraison prévue après archive via DIU puis CABU ; versions actives à prouver.
