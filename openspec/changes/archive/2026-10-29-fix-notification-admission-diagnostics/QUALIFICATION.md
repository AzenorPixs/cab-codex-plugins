# Qualification SCM — CAB2.1.12

## Autorité et périmètre

Demande humaine explicite : correctif sous SCM avec incrément, puis CABU et communication aux sessions de codage. Un seul change, deux lacunes d’observabilité ; règles d’admission/révision/corrélation/décision/once conservées. Source/runtime distincts jusqu’à maintenance coordonnée. Aucun template, copie de protocole, transcript ou métier Pixs écrit par cette session.

## Broker

notification_diagnostic optionnel {http_status,error_code}, code null si inconnu. Lecture du corps sous1024 octets (sonde1025 pour détecter dépassement), codes fermés selon le statut, aucune reprise des messages/champs arbitraires. command-too-long conserve sa reconstruction filtrée existante. Persistance seulement sous lease courante ; ancienne lease ignorée ; livraison suivante retire le diagnostic. Les anciennes approbations restent lisibles sans le champ.

Tests filtrage/confidentialité11/11 ; persistance/corrélation broker16/16. Positifs409resource-revision-stale et400expected-revisions-invalid ; négatifs code inconnu, statut incohérent, forme non fiable, dépassement, lecture impossible, champ arbitraire. Échec HTTP réel simulé dans le transport atteint la relecture persistée de l’approbation, restée PENDING. Les leases périmées ne modifient ni tentatives ni diagnostic ; succès suivant nettoie le diagnostic sans décision.

## Contrôleur

Observateur de refus attaché à chaque requête, corrélé seulement au RUN connu, garde de comptage unique. Le contexte remonte ses refus locaux de validation/rappel et ses gardes natives ; le contrôleur utilise le même observateur. Le compteur httpFailures décrit des tentatives HTTP, pas des demandes uniques ou des décisions métier ; schéma statistique conservé.

Test HTTP intégré ciblé1/1 : trois notifications identiques de révision périmée comptent exactement3 pourA, zéro pourB ; undecided/active/approved/rejected/once restent0, aucun propriétaire/opération créé et aucune réponse native. Une demande valide neuve est admise sans refus parasite ; les gardes de validation ne sont pas modifiées. Les contrôles existants de décisions et permissions passent dans la suite complète.

## Cohérence documentaire

| Document | État et preuve |
| --- | --- |
| Projet réel | Sources2.1.12, runtime2.1.11 préservé pendant la préparation ; activation suivie séparément. |
| AGENTS.md | Non écrit, règles actuelles appliquées, dont relecture des informations DEVOPS régénérées. |
| PROJECT.md | Version de référence et diagnostic/neutralité documentés. |
| TECHNICAL.md | Champ filtré, lease, codes, compteur et limites documentés. |
| BUILD.md | Distribution2.1.12 et distinction activation/source. |
| DEVOPS.md | Non écrit ; chemins Node/Python/OpenSpec et prompts observés utilisés. |
| DEVELOPMENT_MAP.md | Entrée ciblée provisoire ; code non attribué, ACL ultérieur. |
| openspec/BATCH_CODES.md | Correspondance provisoire ciblée ; aucun code créé. |
| README.md | Usage du diagnostic et sens des compteurs expliqués. |
| CHANGELOG.md | Entrée2.1.12 décrivant les deux correctifs. |
| Skill/commande CAB | Procédure de diagnostic, limites et absence d’autorité du FAILED documentées. |
| Référence concurrent-runs.md | Deux clarifications du protocole0.5 reprises (priorité resource-scoped et archive avant REPORT), dans le périmètre documentaire nécessaire. Test d’embarquement intégral conservé. |
| ORCHESTRATED_CODING.md / template | Non écrits. La copie régénérée0.5 préexistante est préservée par empreinte ; ses exemples historiques sont un écart documentaire connu hors correction de ce lot. |
| OpenSpec | Deltas workflow/transport/distribution avant code ; références communes mises à jour, archivage suivi séparément. |

Le contrôle documentaire PLLM a été adapté au nouveau titre et aux formulations équivalentes du protocole0.5 : mêmes invariants obligatoires sur les trois supports, identité stricte entre skill et commande conservée. Le test ne suppose plus l’identité textuelle avec l’ancien titre de protocole. Aucun test ou garde de fraîcheur/conservation/attente humaine/prévol/rejeu n’est supprimé. L’attente d’un nouveau consentement n’a pas été réintroduite pour ces ajustements documentaires nécessaires déjà autorisés.

## Validation finale

Node global548tests :520 réussis,28 ignorés,0échec ; Python80/80 ; banc natif OpenCode privé1/1. Les ciblés ne sont pas additionnés à ces exécutions ; le banc natif optionnel est ignoré dans la campagne globale puis exécuté explicitement. Journaux output/scm-notification-diagnostics/node-global.log, python-global.log, native-regression.log. Distribution29/29 après ajustements documentaires. Syntaxe55JS/11Python, copies broker et empreintes vérifiées, UTF-8/LF. OpenSpec global standard/strict17/17 avant archive. Aucun fournisseur réel ni faux refus métier injecté pour les tests.

## Archivage et suite autorisée

Archivage natif réussi :2026-10-29-fix-notification-admission-diagnostics. Quatre capacités synchronisées, quatre exigences ajoutées et quatre modifiées ; aucune supprimée. Cartographie/registre ciblés actualisés, code non attribué conservé pour ACL ultérieur. STATISTICS.md vérifié avant Git. Aucun autre change archivé et aucun bilan historique supprimé. CABU et notification des sessions sont explicitement autorisés après publications ; leurs résultats réels sont consignés séparément dans output/scm-notification-diagnostics et le bilan final. Aucune cause d’échec ou mesure historique n’est reconstruite.

Après synchronisation : OpenSpec standard16/16 et strict16/16 ; concordance des 8 exigences finales des deltas avec les specs vérifiée, empreintes du code inchangées et rapport à six sections contrôlé.
