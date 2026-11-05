# Qualification SCM — CAB 2.2.32

4novembre2026, Europe/Paris ; code non attribué, ACL ultérieure.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, client V2, recovery, superviseurs, distribution et CABU | 793 | 0 | 0 |
| Python de référence | 103 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 897 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2232-{node-final,stale-boundary-final,python,native-final,spec-before}.log.
Node final =792tests de campagne complète +1test distinct d’empreinte périmée
ajouté ensuite, sous la même implémentation inchangée.16nouveaux tests inclus,
aucun cumul des essais ciblés. Positifs : COMPLETED/RECONCILED ciblés sans token
fourni, réponse filtrée, once/résultat exacts, reprise après réponse perdue et
redémarrage. Négatifs : mauvais owner/frontière/fencing/token/outcome, SID
occupé, permission, mandat courant, empreinte périmée, accès restauré,
quarantaine et opération non terminale. Une intention sans effet observé reste
outcome-unverified sans nouvelle mutation.

Les premiers essais ciblés utilisaient une notification SSE legacy inadaptée
puis une part enrichie de sessionID dont le hash différait du transcript V2.
Les gardes ont refusé completion/outcome ; la fixture utilise désormais le
transcript natif V2 et l’événement session.idle pour la réconciliation exacte.
Aucun hash/proof ou garde de production n’a été assoupli pour ces essais.
Le banc natif réel exerce release-access sur une opération carrier terminée,
sans token dans l’input de récupération et sans exposition dans le reçu.

Deux runtimes changés : contrôleur/recovery. Liaison privée du token/fencing,
empreinte complète interne vérifiée avant/après lectures natives, route
locks/release inchangée et rejet des effets inconnus conservé.72fichiers
syntaxiques,234liens,UTF-8/LF,0775 et copies broker identiques vérifiés.
Skill3924octets,commande3605,somme9988 : budgets tenus. Nom publicCAB conservé,
sans conformité générique hyphen-case revendiquée. OpenSpec20/20 avant archive et19/19 après archive, contrôles réussis.

Constat production read-only : .12HELD/nonquarantiné,29membres tous terminaux ;
le token n’est plus dans le contexte owner et les previews restaurées sont
inapplicables. Cela ne prouve ni nettoyage physique ni libération admissible.
Le correcteur n’a libéré aucun accès/bail Pixs. Après activation, le propriétaire
relit le plan, ses preuves et la policy avant toute action ; le bail.06 et la
quarantaine.03 ne sont pas restitués par release-access. Publication, activation
et décision opérante de libération sont des preuves distinctes.
