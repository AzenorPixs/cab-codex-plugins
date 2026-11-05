# Qualification SCM — CAB 2.2.35

5novembre2026, Europe/Paris ; code non attribué, ACL ultérieure.

| Campagne finale unique sur code figé | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur, registre, client V2, recovery, distribution et CABU | 871 | 0 | 0 |
| Python de référence | 120 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 992 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2235-{node-final-frozen,python-final-frozen,native-final-frozen,spec-before}.log.
Commande et reçu d’exécution : cab-2235-work-0oad061y/final-node-command.json et
final-node-result.json. Node --test-concurrency=2, exit0.71empreintes de code/tests
inchangées avant/après ; aucun changement de code après gel.
17nouveaux tests Python inclus dans120, essais ciblés non cumulés.

Tests ciblés : non-livraison/absence de lease et retryfutur, ACK+persistence,
ACKsanspersistence, livraison concurrente sans attribution, terminal concurrent,
décision déjà corrélée sans renotification, réponse ET registreFAILED sur échec,
COMPLETED sur succès, résultat contradictoire/inconnu failclosed, diagnostics
filtrés, budget/cooldown conservés, clôture manuelle contradictoireFAILED,
ancien reçu conservé sans réécriture, réponse MCP structuréeFAILED sans faux
succès. Aucun défaut masqué par un changement de délai, de garde ou de tests.
Le banc natif requalifie les parcours existants Edit/Write/once/refus/recovery.
Il ne simule pas une récupération réelle de PA01, laquelle reste hors mandat
opérationnel du correcteur.

Deux copies d’un même runtime changent sémantiquement : serveur broker source
et distribué. Préconditions/actionneurs/ordonnanceur et budgets inchangés ;
classification du résultat et clôture vérifiée seulement. La condition du
catalogue décrit décision appliquée, terminal observé ou livraison confirmée.
Aucun nouveau droit métier ni automatisme.71fichiers syntaxiques,251liens,
UTF-8/LF et0775 vérifiés, copies broker identiques. Skill3921octets,
commande3600,somme9983 : budgets tenus. Nom publicCAB conservé sans conformité
générique hyphen-case revendiquée. OpenSpec20/20 avant archive et19/19 après archive, contrôles réussis.

Constat opérant reçu : remédiationPA01 annoncéeCOMPLETED/NOTIFICATION_REESTABLISHED
avec livraisonfalse/FAILED/PENDING. Le correcteur n’a exécuté aucun appel de
remédiation, poll, décision ou effet sur ce RUN. L’absence de diagnostic HTTP
ne prouve aucune cause réseau ;17tentatives et dates sont des observations,
pas une preuve de résolution. Après activation, les nouveaux résultats non
rétablis serontFAILED ; les anciens reçus ne sont ni réécrits ni rejoués.
Publication, activation, état réel de notification et décisions opérantes
restent des preuves distinctes.
