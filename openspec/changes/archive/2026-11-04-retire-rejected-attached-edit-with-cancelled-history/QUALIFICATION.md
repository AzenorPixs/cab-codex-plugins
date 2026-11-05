# Qualification SCM — CAB 2.2.25

4novembre2026, Europe/Paris ; code non attribué.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, recovery, distribution et CABU | 559 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 655 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2225-{node,python,native,spec-before}.log.
Les13 nouvelles régressions font partie des559Node, sans cumul des essais
ciblés. Registre : vrai handoff, ancien parent CANCELLED sans émission,
enfant courant et retrait durable ; refus ancien PREPARED, native, résultat,
once, identité étrangère et enfant ancienSID. HTTP : edit path refusé sur
mandat filePath, parent annulé HELD, retrait ciblé, replay/restart identique,
permission tardive sans once ; ACK manquant, session occupée et permission
supplémentaire refusés sans mutation. Les premiers essais de construction des
fixtures ont échoué (champ de plan, clôture de mandat et garde tardive attendue) ;
fixtures rectifiées sans assouplir une garde du moteur pour ces erreurs.
L’historique multiSID est éprouvé au registre après vrai handoff ; HTTP éprouve
le retrait edit attaché, sans présenter sa fixture comme un handoff natif réel.

Deux fichiers runtime modifiés : registre (exception historique annulé sans
native/résultat/once) et contrôleur (preuve edit qualifiée existante admise).
Les55autres fichiers runtime sont identiques au paquet2.2.24 hors version.
Syntaxe71fichiers, UTF-8/LF, fichiers projet0775 ;241liens relatifs contrôlés.
Skill3964octets, commande3581octets, commande+status9964octets : budgets respectés.
Nom canonique CAB conservé ; aucune conformité générique hyphen-case revendiquée.

OpenSpec strict20/20 avant archive. La preuve réelle C12.33 a été lue sans
mutation : PREPARED/no native/no result/no once, parentHELD14119, historique
CANCELLED d’ancienSID sans émission. Le correcteur ne retire ni ne libère
rien dans le RUN métier. Après activation, le propriétaire doit renouveler les
observations et appliquer la même voie de retrait sous sa policy courante.

Le parent reste strictement identique ; APPROVED reste historique, aucun
NO_EFFECT ou résultat natif n’est fabriqué. Les gardes d’émission crossSID
restent inchangées et testées. Clôturer un accès ne contenant ensuite que des
annulations sans effet relève d’une action propriétaire distincte et qualifiée,
puis d’un accès neuf pour l’édition correcte, sans libérer les autres protections.
Publication, activation et reprise réelle restent des preuves séparées.
