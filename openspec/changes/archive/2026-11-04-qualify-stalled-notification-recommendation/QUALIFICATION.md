# Qualification SCM — CAB 2.2.31

4novembre2026, Europe/Paris ; code non attribué, ACL ultérieure.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node client V2, permissions, superviseur, recovery, distribution et CABU | 251 | 0 | 0 |
| Python de référence, dont 8 régressions de recommandation | 103 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 355 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2231-{node-final,python,native-final,spec-before}.log.
8nouvelles régressions Python incluses dans103, essais ciblés non cumulés :
FAILED/retry_overdue, jamais livré vide/PENDING, SENDING expiré, sous-états mixtes,
incomplets ou contradictoires, plusieurs retries, cause indépendante et appel
historique unargument ; health utilise son propre snapshot et n’exécute aucune
récupération. Les préconditions/budgets/actionneurs/ordonnanceur restent inchangés.
Le code de cause et la readiness restent conservés même avec recommandation corrigée.

Seul le serveur broker et sa copie changent sémantiquement ; les autres runtimes
restent identiques hors version.71fichiers syntaxiques,228liens,UTF-8/LF et0775,
copies broker identiques. Skill3924octets,commande3605,somme9988 : budgets tenus.
Nom publicCAB conservé sans conformité générique hyphen-case revendiquée.
OpenSpec20/20 strict avant archive et19/19 après archive.

Preuve opérationnelle lue sans mutation : notification C12 catalogue.36,
PENDING/FAILED/retry_overdue, lease vide, 11tentatives de notification et dernier
HTTP503broker-coordination-not-ready ; contrôleur admission404 sans propriétaire,
validation ou décision locale. Cela n’autorise ni décision ni renotification
par le correcteur. Les évaluations MCP et la décision opérante appartiennent
au propriétaire via son raccord existant. Aucun RUN/SID/accès/bail Pixs muté,
aucune action contrôlée exécutée et aucun LXC utilisé pour ce diagnostic.
Après activation, vérifier la recommandation RECONCILE_PENDING_APPROVALS sur le
même sous-état si encore présent ; ne pas exiger artificiellement READY tant
qu’une notification réelle reste PENDING/stalled. La récupération effective
reste distincte du correctif de diagnostic et de la publication/CABU.

Le contrat distingue aussi le bail HELD non restauré, ses previews spécialisées
et release-test sous preuves de nettoyage/vérification ; aucune restitution
fictive, commande LXC ou autorisation métier ne vient de cette clarification.
