# Qualification SCM — CAB 2.2.27

4novembre2026, Europe/Paris ; code non attribué.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, client V2, ports, recovery, distribution et CABU | 673 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 769 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2227-{node-final,python,native,spec-before}.log.
24nouvelles régressions HTTP incluses dans673Node : mise en forme rapportée,
blancs légaux, compact, ordre de clés de métadonnées et diagnostics sans effet ;
compatibilité get/poll terminal seuls. Refus de chaînes/identités/opérateurs
modifiés, mots fusionnés, commentaires/instructions ajoutées, code trop long,
return/throw suivis de saut de ligne, calls supplémentaires, executed=true,
wrapper tronqué/actif/opaque. Zéro décision/once/accès fabriqués, persistance
et redémarrage éprouvés. Les essais ciblés ne s’ajoutent pas au total.

Une première campagne complète671/0 a précédé deux tests de compatibilité
supplémentaires get/poll ; la campagne finale673/0 la remplace. Une régression
ciblée a révélé que le wrapper vide de métadonnées disparaissait de la preuve ;
la garde le traite désormais comme non qualifié. L’ancien test nommant un
simple espace final divergent est remplacé par une vraie instruction ajoutée ;
l’espace final est explicitement qualifié en positif. Aucun échec n’est caché
par un assouplissement d’effet, d’identité ou de permission.

Un fichier runtime change : contrôleur, avec tokenizer fermé borné16384,
arguments exacts et diagnostics purement observés. Aucun eval/parser externe.
Les56autres runtime sont identiques au paquet2.2.26 hors version. Syntaxe70
fichiers, UTF-8/LF et fichiers projet0775 ;244liens relatifs vérifiés.
Skill3964octets, commande3581octets, commande+status9964octets : budgets respectés.
Nom publicCAB conservé, sans conformité générique hyphen-case revendiquée.
OpenSpec20/20 avant archive ; publication/activation distinctes.

Preuve réelle lue sans mutation : cancel natif PA01 completed/executed=false,
truncated=false, search puis unique cancel, terminalCANCELLED/OC ; wrapper de
diagnostic distinct limité aux queries MCP complètes. Le libellé request_validation
est une projection CodeMode, pas une preuve d’appel direct. L’annulation ne
sera pas rejouée. Après activation, observer la convergence automatique de
la coordination, sans withdrawNOT_ADMITTED sur unCANCELLED et sans restaurer
un ancien état. Les effets et protections non concernés restent conservés.
Le diagnostic distinct C12 sur une commande sans ACK ne fait pas partie de
ce correctif ; il ne retarde pas sa publication.
