# Qualification source — CAB2.3.6 — 6novembre2026

## Bilan vérifié
- Campagne générale Node :1400cas,1368PASS,1échec de démarrage du banc,
  31SKIP. Le seul échec, garde du moniteur, passe isolément1/1 sans modification.
- Après les deux ajouts ciblés (capacité512 et refus d’un storestage invalide),
  campagne affectée CABU/carrier/distribution :152/152PASS.
- Sondes scellées HTTP avec nativeInput/tool_input_sha256 réels :10/10PASS,
  inclus dans la campagne générale. Corps absent du manifeste modèle, lanceur
  inférieur2Kcaractères, livraison avant once refusée puis corps byte-exact.
- OpenCode réel isolé :2/2PASS, dont CodeMode et transport scellé réel.
- Python :193/193PASS ; py_compile explicite13fichiers modifiés.
- Cas historique supplémentaire : véritables modules233,broker235,
 128stages,layoutclassique,servicesrésiduels etoptionmanagedforcée :1/1PASS.
- Bilan distinct après reprises :1567cas exécutés réussis,29SKIP. Campagnes
  répétées non additionnées. Aucun échec restant.
- Syntaxe :129fichiers JS/Python. OpenSpec strict22/22 avant archive.

## Port et carrier
Deux captures/onces séparées sous SID source ou courant après handoff ;
identitésrequest/approval divergentes sans permit interSID ; payload libre,
scope élargi, stage ambigu, répertoires changés, autre lanceur et capture
périmée refusés. Fraîcheur120s, once, scopeportread et effet historique
inconnu restent conservés. Aucun nouvel effet C12 émis par le correcteur.
Le plafond512 garde64Kio par corps et16Mio par registre ;513e refusée sans
mutation.512entrées se restaurent. Aucun stage historique supprimé.

## Reprise CABU classique
Le layout du reçu est conservé, même si l’appelant force managed. Les résidus
de service sont arrêtés avant capture finale ; le registre métier reste égal
au prévol. Broker avancé accepté seulement byte-identique au code qualifié
hors déclaration de version ; octets conservés en audit. Cible historique
achevée dans le même reçu, nextUpdateRequired explicite pour alignement suivant.
Stage/sauvegardes et données métier ne sont pas réinitialisés. Le lecteur
cible valide aussi le registre des stages avant copie. Classique neuf couvert.
Le cas portable réel ne sera déclaré résolu qu’après sa reprise sur place.

## Incidents de banc
Les premières extensions de fixture ont exposé une URL de test manquante,
une action legacybash ne portant pas la preuveV2shell, puis une métadonnée de
fin absente. Fixtures mises au format natif complet, aucune garde relâchée.
La garde moniteur a dépassé son délai de démarrage en campagne parallèle ;
reprise isolée réussie, échec initial conservé dans node-final.tap.

## Preuves et limites
Journaux ignorés autorisés :output/scm-sealed-port-probes/node-final.tap,
capacity-distribution-final.tap,port-http-final.tap,native-final.tap,
python-final.log,historical-classic.tap,monitor-guard-final.tap,shell-stage-final.tap.
Empreintes :source-freeze.json. Aucun correctifpagination : PA01 avait joint
un autre serveur natif et créé un SID homonyme ; origine/CLI documentés.
Les règles utilisateur2.4.0 sont conservées dans le suivi, non prétendues actives.
Après plus128stages, ancien lecteur incompatible possible : reprise en avant,
pas de restauration manuelle d’un ancien état métier.

Livraison prévue après archive via DIU puis CABU. Versions actives, continuité
et reprise des consommateurs restent des preuves opérationnelles distinctes.

Complément documentaire avant livraison : le faux positif d’opération disparue
PA01 a été résolu par comparaison exacte de deux IDs (suffixe supplémentaire
dans la requête). La cible déclarée initialement reste PREPARED/approved.
Le guide de triage rappelle le rapprochement des chaînes sans reconstruction.
Aucun correctif de persistance ni mutation du RUN n’a été effectué.
