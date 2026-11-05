# Qualification SCM — CAB 2.2.34

5novembre2026, Europe/Paris ; code non attribué, ACL ultérieure.

| Campagne finale unique sur code figé | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, client V2, recovery, distributions et compatibilité Edit/Write | 871 | 0 | 0 |
| Python de référence | 103 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 975 | 0 | 0 |

La référence finale Node est cab-2234-node-final-frozen-2.log, commande exacte
dans cab-2234-work-twyci98i/final-node-command.json et reçu d’exécution
final-node-result.json : --test-concurrency=2, exit0,72empreintes inchangées
avant/après. Python : cab-2234-python-final-frozen.log ; natif :
cab-2234-native-final-frozen.log. Tous sous /home/ade/.codex/.tmp, privés.
Aucun fichier de code/tests n’a été modifié après ce gel.

40nouvelles régressions Write incluses (30unitaires/ressources,10HTTP), plus
17anciennes régressions Edit explicitement incluses pour compatibilité.
Projection : call write/nativeTool/digest et ACK visibles même sans événement
journal, couverture MISSING_RELEVANT_CALLS conservée ; aucun contenu exposé.
Preuve : path/content fermé, categoryedit, call/cible/digests/receipt exacts,
input natif distinct de l’approuvé. ACK absent/INTENT/non204, autre PID/version/
SID/call/permission, mauvaise cible ou input changé, schéma supplémentaire/
alias/mauvais type, part exécutée/erreur nonaborted, activité/permission,
call supplémentaire, second fichier/commande et troncature de reçus refusés.
Gardes parent : restored/quarantaine/second membre refusés, seconde ressource
conservée, parent partagé et ses autres opérations inchangés. Retrait dédié
puis release-access sous deux reçus, reprise après réponse perdue/redémarrage
sans second reject/write/once et sans token public.

Le banc OpenCode réel provoque un Write divergent sous permissionedit, observe
le blocage du digest, rejette via SDK officiel/ACK204, constate call et reçu
dans native-evidence, puis retire l’enfant et libère l’accès sous policy. Le
fichier reste inchangé, APPROVED historique conservé, aucune native/once/
nativeResult de cet enfant. Le banc Edit existant passe aussi.

Essais antérieurs non cumulés : une collision de nom const dans la fixture
native a été corrigée par un bloc local avant le banc final. Une première
campagne Node post-gel a produit870PASS/1FAIL, timeout d’initialisation d’un
contrôleur de fixture (setup/start), avant exercice du garde. Ce cas isolé
passe ; relance COMPLÈTE sur les mêmes72empreintes avec concurrence de fichiers
limitée à2 :871/871. Aucun garde ni délai n’a été modifié. La cause précise du
timeout n’est pas attribuée ; log rouge conservé cab-2234-node-final-frozen.log.
La première campagne870/0 antérieure au dernier test non204 et les tests
ciblés ne s’ajoutent pas aux compteurs finaux.

Seul recovery-evidence.mjs change sémantiquement. Le client normalisait déjà
writeV2 ; aucun format de journal SDK ni contrôle d’émission n’est assoupli.
72fichiers syntaxiques,246liens,UTF-8/LF,0775 et copies broker vérifiés.
Skill3921octets,commande3600,somme9983 : budgets tenus. Noyau/index/références,
entrée skill/plugin et commande sont cohérents. Nom publicCAB conservé sans
conformité générique hyphen-case revendiquée. OpenSpec20/20 avant archive et19/19 après archive, contrôles réussis.

Preuve production lue sans mutation : .72 write/error/aborted/executedfalse,
path/content exact observé, digest19eaaec833ac5adf1f89e1e1c5fa5ce62375a3a2fa6c9ce063c9b61219ac0be2,
rejet SDKACK204 exact/PID10912/version2.2.5. Le correcteur n’a ni écrit le rapport
ni retiré/libéré l’opération. Après activation : relire diagnostic/plan frais,
conserver le reçu409 ancien, utiliser un actionId neuf sous décision owner.
Publication, activation et récupération/édition métier restent distinctes.
