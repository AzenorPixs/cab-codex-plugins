# Qualification SCM — CAB 2.2.39

5 novembre 2026 ; complément documentaire explicitement autorisé avec aide à
PA01. Code non attribué ; convergence ACL ultérieure.

| Campagne finale ciblée sur code figé | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node distribution du contrat, services et CABU | 129 | 0 | 0 |
| Python de référence | 125 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 255 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2239-{node-final-frozen,python-final-frozen,native-final-frozen}.log.
Commande et reçu Node : cab-2239-work-as0p8ua7/final-node-{command,result}.json.
70 empreintes de code/tests figées avant/après. Chaque changement runtime/test
est strictement la substitution2.2.38→2.2.39, comparaison systématique exécutée.
Aucune garde, action ou limite d’exécution modifiée. La qualification de2.2.38
n’est pas recomptée comme une nouvelle campagne. Aucun nouveau test miroir de
la prose ; les exemples documentaires sont contrôlés dans un banc privé.

synthetic-payload-proof.json (même dossier privé) conserve4cas de sources
imbriquées : enveloppe Bash valide/Python cassé, source raw correcte LF0a,
suréchappement syntaxiquement valide mais valeur5c6e incorrecte, forme AST
fermée bytes([10]). Aucun helper n’a été exécuté ni secret lu.3round-tripsJSON
couvrent tab,newline,quote/backslash/Unicode ; le JSON à tabulation brute est
refusé par le parseur strict. L’exemple Python publié a été exécuté seulement
sur ses données synthétiques. Ces vérifications ne sont pas cumulées aux255.

70 syntaxes,318liens,UTF-8/LF,0775 et3paires source/distribution broker vérifiés.
Skill3946octets,commande3594,commande+status9977 ; lecture de la seule fiche utile.
OpenSpec20/20 avant archive et19/19 après. Référence nouvelle liée au triage,
carrier et préparation locale ; skill/plugin/commande restent de même version.

Observations opérantes distinctes : première tentative SyntaxError dans un
helper rendu ; seconde tentative corrigée bytes([10]) a produit un artefactCT100
réel, mais le rapport BUILD_OK contenait une tabulation ldd non échappée et la
commande globale a terminé20. Un artefact construit ne qualifie pas MainPID,
la recette n’était pas encore exécutée. Le correcteur conseille la correction
du producteur via json.dumps et la réobservation de l’artefact existant ; il
n’exécute ni SSH ni build, ne modifie ni RUN ni accès. Les effets connus et
inconnus restent à réconcilier par le propriétaire avant toute nouvelle unité.

DIU indisponible sur cet hôte ; pipeline Git existant utilisé, pas d’exécution
DIU revendiquée. Publication, CABU et reprise effective ont des reçus distincts.
