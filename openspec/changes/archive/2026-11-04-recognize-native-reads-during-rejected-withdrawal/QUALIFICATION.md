# Qualification SCM — CAB 2.2.26

4novembre2026, Europe/Paris ; code non attribué.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, client V2, ports, recovery, distribution et CABU | 649 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 745 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2226-{node,python,native,spec-before}.log.
12nouvelles régressions HTTP incluses dans649Node, sans addition des essais
ciblés : read pur, read avec fenêtre, retrait non attaché ; refus executed=true,
read actif/erreur/input inconnu/fenêtre invalide/tronqué, outil imitant read,
write et shell supplémentaire. Parents/révisions/baux identiques, zéroonce.
La première fixture négative nommée legacy était reconstruite par le serveur
factice comme un vrai read natif ; fixture remplacée par un outil imitant read
avec métadonnées libres fabriquées. Aucun comportement moteur assoupli pour
faire passer ce cas de fixture. Les tests ciblés finaux12/12 ne sont pas cumulés.

Deux fichiers runtime changés : client V2 dérivant nativeFormat/nativeTool
pour read non exécuté, contrôleur classifiant cette observation sous conditions.
Les55autres sont identiques au paquet2.2.25 hors version. Syntaxe70fichiers,
UTF-8/LF et fichiers projet0775 ;242liens relatifs contrôlés.
Skill3964octets, commande3581octets, commande+status9964octets : budgets respectés.
Nom canonique CAB conservé, sans conformité générique hyphen-case revendiquée.
OpenSpec strict20/20 avant archive ; publication/activation distinctes.

Observation réelle sans mutation du RUN : trois read C12 après .33,
completed/executed=false, input[path], truncated=false. Les deux wrappers
execute postérieurs contiennent seulement broker_readiness completed,
executed=false/truncated=false, déjà qualifié sans effet. L’edit refusé reste
le seul candidat mutateur après classification26. Reçu de retrait précédent
DONE409 conservé, childPREPARED/no native/result/once, parentHELD inchangé.

La source ne contourne ni le rejet edit exact, ni l’ACK204, ni les deux
frontières, ni les gardes de parent ou d’émission historique. Aucun nouvel
outil n’est autorisé à lire ; la classification observe des calls déjà
présents dans le transcript authentifié. Une future reprise doit employer
un actionId neuf et des preuves fraîches après activation, sans rejouer edit.
Le correcteur ne mute aucun RUN, accès, bail, permission ou once Pixs.
