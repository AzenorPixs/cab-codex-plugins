# Qualification SCM — permissions avant prévol CAB2.1.29

30octobre2026. Change unique, code non attribué ; attribution ACL ultérieure.

## Origine établie

Une commande explicite du pilote a appliqué quatre règles deny pour une revue en lecture/propositions le30octobre2026à20:14:33.399Z, processus terminéexit0à20:14:34.076Z. Les quatre règles shell/edit/subagent/skill produisent l’empreinte150e3a1022895bacf2f3564aa577fcc7945ff8e7a035c7199bc0cdb7ba2aeef2, identique aux observations avant et aprèsCABU28. Le propriétaire confirme la finalité de revue et l’omission du contrôle ask de reprise. Le contrôle préalable du prévol vérifiait modèle/inactivité/absence de demandes/accès, mais pas les règles ask. Le refus409 du contrôleur était correct ; cette mutation ne doit pas être attribuée à CABU. Références opérationnelles filtrées dans output/permission-preflight29/ORIGIN.json ; aucun transcript complet ou source métier copié dans le projet.

## Correction et portée

Prédicat existant extrait sans changement de résolution dans permission-policy, partagé client/contrôleur. L’inspection nativePermissionPolicy est en lecture seule. requiredNativeAsk contrôle shell/edit avant prompt ; un refus n’envoie ni prompt/MCP/PATCH ni once. La revue historique sans exigence reste possible sous deny. Une transition minimale et auditable appartient au propriétaire ; aucune levée automatique, allow, autreSID ou restauration par CABU. Le contrôleur revérifie indépendamment lors de l’admission, décision etonce. Un changement de modèle explicitement demandé est suivi d’un nouveau contrôle avant prompt.

## Preuves exécutées

Node682cas :651réussis/31ignorés/zéroéchec ; concurrence136 en35,285826s et autres515réussis sur546cas en59,319520s. Python81/81 en4,881s. Campagne privée exacteOpenCode2.2.0 :4/4 en21,212416s. Total réussi exécuté736, ciblés non additionnés. Syntaxes72JS/16Python, copies broker identiques, UTF-8/LF et empreintes protégées. OpenSpec standard/strict17/17 avant archive.

Comparaison mécanique de8 000situations avec le prédicat installé2.1.28 : résultats identiques, hors total de tests pour éviter double comptage. Matrice de règles : deny/allow, absence/malformation, dernier match, glob, ressources spécifiques, alias, modes historiques ask/deny. Client : politique filtrée, option invalide, SID divergent, shellask/editdeny, contextePOSTexact, refus avantmodèle/prompt et nouveau refus après changement explicite de modèle.

Banc natif : session de revue deny refusée avant prompt, messages/fournisseur/MCP/permissions inchangés ; PATCH explicite du propriétaire de fixture vers shellask, edit/subagent/skill restantdeny ; appel protégé accepté et règles inchangées. Prévol complet existant exécuté via le gardeclient, avec décision/HELD/once/exit et readiness ; gardes serveur concurrentes existantes restent réussies. Aucune politique de production modifiée pour la recette.

Écarts initiaux conservés : la recette native avait relu son catalogue après le prompt d’une session editdeny ; le modèle ne recevait alors plus edit, d’où assertion sur catalogue inexistante. Capture du catalogue qualifié replacée avant la session deny, puis natiffinalréussi. La première campagne globale signalait deux échecs d’installation indépendante du moniteur : nouvelle dépendance absente de la liste documentaire. Liste, commande/référence et compteur du banc complétés ; installation autonome5/5 puis groupe complet515réussis. Aucun échec initial présenté réussi ni additionné au bilan final.

AGENTS,DEVOPS,ORCHESTRATED_CODING et concurrent-runs conservés parSHA256 ; aucun template ou contexte de session active modifié. Publication, activationCABU et information restent à prouver séparément. Les nouveaux gardes doivent être adoptés explicitement par les orchestrateurs après activation ; leur présence ne réécrit pas un ancien pilote. Preuves : output/permission-preflight29/.
