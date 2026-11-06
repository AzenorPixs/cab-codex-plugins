# Qualification source — 6 novembre 2026

## Périmètre
Attribution des ancêtres natifs et du client interactif, diagnostics bornés,
contrôles de stabilité, commande native sous16384caractères dans les scénarios
qualifiés. Aucune action métier dans C12, aucun kill ni levée de quarantaine.
Ancêtres10859/10910 et client10931 vérifiés en lecture seule : même filiation,
exécutable natif, terminal et sockets TCP appariées. Identités réelles de ces
processus conservées uniquement comme preuve datée, jamais comme whitelist.

## Résultats observés
- Campagne Node :1374cas,1260PASS,83échecs initiaux,31SKIP.
- Les échecs initiaux sont localisés :74sites CABU avec sous-cas,5sites de
  distribution et1site restauration. Couplage des unités/attentes de version
  corrigé ; la restauration passe isolément (collision de port du banc en
  campagne concurrente, aucune modification du comportement produit).
- Reprises finales : CABU92/92, distribution37/37, restauration29/29,
  sonde Linux19/19 et contrôleur port/reboot17/17. Aucun échec restant.
- OpenCode natif réel isolé :1/1PASS ; exécute un cas SKIP de la campagne.
- Python :193/193PASS. Bilan distinct après reprises :1537cas exécutés et
  réussis,30SKIP ; campagnes répétées non additionnées.
- Syntaxe :129fichiers JS/Python contrôlés. Empreintes figées dans
  output/scm-native-port-infrastructure/source-freeze-final.json.
- OpenSpec :22/22strict avant archivage. Première proposition trop longue
  refusée en strict, exigences séparées puis validation réussie.
- Les deux sondes et la revue propriétaire ne sont pas remplacées par ces tests.

## Preuves
Journaux autorisés non versionnés :output/scm-native-port-infrastructure/
node.tap,cabu-final.tap,distribution-final.tap,restoration-final.tap,
port-final.tap,controller-port-final.tap,native-final.tap,python.log,syntax.json.
Le diff fonctionnel est limité au contrôleur et à port-recovery ; les autres
modules ne changent que leur version couplée. Les cadrages, le contrat distribué,
les empreintes et les attentes de version des tests sont alignés. DEP/SGS/CCAB
permanents et migration CABU ancienne exclus de cette livraison2.3.4.

## Livraison
Prévue après archivage via diu projects cicd cab2.3.4 puis CABU GitHub vérifié.
Le résultat distant et runtime doit être observé séparément. Les captures2.3.3
ne sont pas réutilisables. Aucun repli d’état métier ni réécriture du registre.
