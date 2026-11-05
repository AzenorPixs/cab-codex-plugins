# Qualification SCM — CAB 2.2.33

5novembre2026, Europe/Paris ; code non attribué, ACL ultérieure.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, client V2, recovery, superviseurs, distribution et CABU | 814 | 0 | 0 |
| Python de référence | 103 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 918 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2233-{node-final,python,native-final-verified,spec-before}.log.
21nouveaux tests Node inclus, essais ciblés et première exécution native non
cumulés. Tests : offre sur accès dédié monomembre PREPARED/APPROVED, rejet edit
ACK204, retrait CANCELLED conservant parent/token/fencing/membership/révisions,
APPROVED historique et absence de native/nativeResult/once, puis release-access
sous reçu distinct. Reprise des deux reçus après redémarrage, sans second effet.
Refus : ACK absent, SID occupé, permission, effet supplémentaire, cible/frontière,
parent état/propriétaire/contexte/version, ancien SID, native/résultat/once,
restauration, quarantaine, empreinte changée, autres liens/membres.

Une première fixture tentait la libération ordinaire après un redémarrage non
certifié : la garde restored l’a correctement refusée. La composition est
qualifiée avant redémarrage, puis ses deux reçus rejoués idempotemment après.
Aucune garde de production levée pour cette correction de fixture.
Le banc natif réel crée un RUN dédié en fixture privée, provoque un edit divergent
bloqué, le rejette viaSDK en journalisant ACK204 dans le runtime attendu, puis
retire l’unique membre et libère l’accès par policy sans token fourni. Le fichier
reste inchangé et aucune once native n’est acquittée pour cet edit. Les autres
RUN et preuves du banc sont conservés ; la qualification ASK persiste aussi.

Trois runtimes changent : registre, recovery et contrôleur. allowSingleton est
une option interne activée seulement dans la récupération ; la valeur par défaut
conserve le refus historique. Aucun nouveau type d’action ou argument CAB.
72fichiers syntaxiques,240liens,UTF-8/LF,0775 et copies broker vérifiés.
Skill3924octets,commande3605,somme9988 : budgets tenus. Nom publicCAB conservé,
sans conformité générique hyphen-case revendiquée. OpenSpec20/20 avant archive et19/19 après archive, contrôles réussis.

Preuve production en lecture seule : C12.60 PREPARED/APPROVED, accès dédiéHELD
monomembre nonquarantiné, edit aborted/executedfalse, rejet ACK204 exact,
SIDidle/permission0, aucune native/nativeResult/once. Le correcteur n’a exécuté
aucun retrait ou libération dans Pixs. Après activation, le propriétaire relit
preuves/policy/plan avant les deux actions et vérifie leurs reçus distincts.
Publication, activation, retrait propriétaire et édition métier sont séparés.
