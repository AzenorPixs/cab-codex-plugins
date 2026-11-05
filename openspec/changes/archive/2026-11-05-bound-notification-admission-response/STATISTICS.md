# Statistiques — CAB 2.2.36

## 1. Statistiques générales et décisions
SCM corrective directe,5novembre2026 ; code non attribué, ACL ultérieure.
Aucun agent délégué. Durée globale,tokens/cache/coût/modèle exact : N/A faute
attribution exhaustive. Les essais finaux utilisent71empreintes figées.

## 2. Types de messages et d’outils
Diagnostic API filtré et coordination PA01,broker/source,tests HTTP privés,
qualification OpenSpec/docs,gel,syntaxe et livraison. Totaux exhaustifs : N/A.

## 3. Approbations, refus et fichiers
Timeout HTTP dédié à la notification10s, sous lease15s ; lectures2s conservées.
Broker source/copie,5tests nouveaux,contrat et versions. Aucune mutation métier
PA01 par le correcteur ; même SID/approval/bail conservés. Nombre exact de
messages/éditions : N/A faute d’une collecte exhaustive.

## 4. Tests et vérifications
| Campagne finale | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node campagne complète finale, concurrence2 | 871 | 0 | 0 |
| Python de référence | 125 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique final | 997 | 0 | 0 |

997cas finaux uniques réussis. Trois campagnes précédentes avaient chacune
un timeout10s au setup d’un scénario différent, chacun repris isolément avec
succès. Campagne complète finale871/871 sur code inchangé ; les3incidents et
reprises restent dans QUALIFICATION.md, hors total final.5nouveaux
tests inclus dans125. Ancien délai2s reproduitFAILED pour réponse202 après2,25s,
puis10sDELIVERED ; essai comparatif non cumulé. Voir QUALIFICATION.md et logs.
71syntaxes,286liens,UTF-8/LF,0775 et copies broker vérifiés ; OpenSpec20/20 avant
archive,19/19 après archive.

## 5. Commandes et accès web
Node --test/--check,unittest/py_compile,OpenSpec,HTTPloopback filtré,Git et CABU.
DIU indisponible ; pipeline Git existant, aucune exécution DIU revendiquée.
Aucun shell métier, poll, remédiation ou once PA01 par le correcteur.
Totaux exhaustifs : N/A.

## 6. Bilan, limites et reproductibilité
Délai10s sous lease15s ; gardes,IDs,décisions,budgets et historique conservés.
Skill3921octets,commande3600,commande+status9983.997cas finaux réussis
sur la dernière campagne complète, incidents antérieurs de setup explicites. Aucun
coût ou gain LLM extrapolé. Publication,activation et reprise PA01 sont des
preuves distinctes. Le correctif ne promet pas l’admission d’un payload refusé.
