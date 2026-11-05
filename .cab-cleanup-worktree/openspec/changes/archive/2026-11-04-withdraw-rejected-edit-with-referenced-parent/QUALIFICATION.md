# Qualification SCM — CAB 2.2.30

4novembre2026, Europe/Paris ; code non attribué, ACL ultérieure.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, client V2, recovery, superviseurs, distribution et CABU | 777 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 873 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2230-{node-final,python,native-final,spec-before}.log.
19nouvelles régressions incluses dans777Node, sans cumul des essais ciblés.
Positifs : rejet edit dont l’input diffère seulement par fin de ligne ; parent
référencé non attaché, offre/action de retrait, CANCELLED isolé, décision
APPROVED conservée, aucun native/nativeResult/once, parent/révisions/baux
inchangés, reprise après réponse perdue et redémarrage. Négatifs : ACK absent,
SID actif, permission, effet supplémentaire, mauvaise cible/frontière,
parent étranger/contexte/version/portée/état/empreinte, multiples accès,
ancien enfant, native/résultat/once. Les anciennes gardes attachées restent
exercées. Un premier test ciblé tentait une libération du parent interdite par
sa garde ; le contrôle d’état divergent est testé directement dans le registre,
sans affaiblir locks/reconcile. Campagne ciblée finale19/19 puis campagne complète.

Trois runtimes changés : contrôleur, recovery et registre. L’option interne
allowReference est activée uniquement dans la récupération propriétaire ;
sa valeur par défaut conserve la garde historique attachée. Les contrôles
natifs d’input/digest et d’émission restent inchangés. Aucun rattachement ni
ACK inventé, aucun effet métier autorisé par le retrait.71fichiers syntaxiques,
224liens,UTF-8/LF et0775 vérifiés ; copies broker identiques.
Skill3924octets,commande3605,somme commande+status9988 : budgets respectés.
Nom publicCAB conservé sans conformité générique hyphen-case revendiquée.
OpenSpec20/20 strict avant archive et19/19 après archive.

Preuve production lue sans mutation : C12.02 PREPARED/APPROVED, unique edit
V2 error/aborted/executed=false, rejet privé ACKNOWLEDGED/HTTP204, SIDidle et
pending0, accessId parent.34HELD mais membershipfalse ; aucune once/résultat.
Le correcteur n’a pas appliqué le retrait dans Pixs. Après activation, le
propriétaire utilise withdraw-unissued-validation avec ses digests frais et
constate CANCELLED isolé, parent et protections inchangés. Publication,
activation et reprise métier restent des preuves distinctes.

Le contrat rappelle aussi que cgpt-validation_request_validation peut être
le nom projeté d’un execute Code Mode ; cabCodeMode et enveloppe brute font
autorité, pas le seul libellé. Le refus PA01 déjà acquis reste historique.
