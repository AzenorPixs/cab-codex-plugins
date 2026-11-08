# Qualification SCM — CAB 2.2.5

## Mandat et périmètre

Mandat explicite du développeur : correctifs sous SCM avec incrément,
publication puis CABU et remontée aux sessions. L’orchestrateur décide et
valide dans le change ; le développeur intervient hors périmètre. Les demandes
des sessions apportent des preuves, sans créer une autorisation indépendante.
Aucune écriture manuelle dans les RUN/job/SID ou le magasin Pixs.

## Matrice fonctionnelle

| Critère | Mise en œuvre | Preuve |
|---|---|---|
| PENDING durable sans communication | action restore-pending-validation sous policy propriétaire | HTTP même opération, décision absente, contexte restauré, décision ultérieure distincte |
| Preuve native fraîche | get_approval direct complet, identité et TTL, deux snapshots | expiré, vieux, identité contradictoire, busy, permission et effet refusés |
| Lecture terminale sans reçu once | action reconcile-reviewed-terminal, revue READ_ONLY, sources épinglées et part exacte | clôture COMPLETED de coordination ; native/nativeResult absents ; aucune once envoyée |
| Incertitude honnête | NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED | résultat et projection après restart, aucun NO_EFFECT produit |
| Autorité et frontière | owner/policy/version/digests, ressources et job exacts | owner, commande/part/call/source, WRITE, doublon et effet additionnel refusés |
| Reprise | intention/observation privées avant mutation et reçu causal | replay, restart, interruption avant contexte et réponse perdue après écritures |
| Compatibilité | schéma 4 conservé, reçu additionnel, anciens workflows inchangés | suite globale 935 cas ; nouvelles actions volontairement inconnues des anciennes policies |

La lecture terminale clôt une coordination, sans qualifier rétroactivement le
fonctionnement de l’autorisation native. Le mandat suivant conserve ses propres
contrôles d’accès et de once. Une source inchangée seule ne prouve pas une
absence d’effet. L’expiration d’une approval n’est jamais prolongée pour faire
passer une récupération.

## Vérifications finales

- HTTP nouvelles frontières : 20/20, inclus dans la suite globale.
- Node : node --test --test-concurrency=2 tests/*.test.mjs ; 935 cas,
  904 réussites, 0 échec, 31 ignorés ; 88 195 ms.
- Python de référence : 93/93, 4 774 ms.
- OpenCode2.2 réel : tests/native-opencode-codemode.test.mjs avec fournisseur
  synthétique loopback ; 1/1, 9 439 ms ; aucune dépense LLM déduite.
- Total final unique exécuté : 998 réussites, 0 échec, 31 ignorés.
- Syntaxe : 89 Node et 11 Python, 100 fichiers distincts.
- OpenSpec strict : 20/20 avant archive ; 19/19 après synchronisation.

## Précontrôles de production, sans mutation

PA01 : demande 596a0f36-921d-43a2-9f17-ca74bf6c3048, opération
op-cismp7-sl07-lxc-cython-verify-45876517-2339-443d-97b5-c9c9c5a07fbf,
PENDING/PREPARED sans décision ou native. La dernière lecture get_approval
est ancienne et transformée dans Code Mode ; elle n’est pas admissible pour
la nouvelle action. L’expression directe exacte et la nécessité d’un get
frais après activation ont été transmises au propriétaire. TTL historique :
2026-11-03T09:27:47.529317Z, non prolongée.

CISMP5 : call_01a1a0928fbe72068fb642138a6de01f, node --check de
frontend/tests/browser-check.mjs, terminal V2 completed/exit0, commande SHA
5fa6ada9bf2d819a2bcaf501fc78769f74fd632e519452c478678156849edebc.
La preuve pure nouvelle passe sur ce transcript exact, sans mutation. La
revue propriétaire et l’application de l’action restent séparées de ce test.

## Échecs intermédiaires et réparation

L’alignement a sélectionné sources au lieu de files dans le manifeste de
migration historique : FileNotFoundError sur ancien protocole local avant toute
écriture de ce manifeste. Le dictionnaire files a ensuite été sélectionné
explicitement et ses destinations actuelles rehachées. Les sources/spans
historiques et le fichier supprimé n’ont été ni modifiés ni recréés. Versions
source/paquets étaient déjà alignées ; aucun commit/tag/push/CABU partiel.

Deux fixtures initiales ont échoué : readiness non republiée après restart,
et wrapper de validation brut non couvert. La première a été corrigée dans
la fixture ; la seconde est désormais auditée par métadonnées natives bornées,
identité complète et revue propriétaire, sans exécuter le code du wrapper.
Les refus adversariaux et les 20 cas HTTP passent après correction.

Les copies src du broker n’avaient pas encore reçu la nouvelle version lors
de la première passe Python : deux assertions de version ont échoué. Elles
sont alignées byte à byte sur broker/ ; nouvelle passe 93/93. La première
passe Node globale avait cinq expressions régulières d’attente de version
restées en2.2.4 et un démarrage de fixture dépassant sa borne ; les attentes
ont été corrigées, distribution33/33 et reprise isolée1/1, puis la suite
globale finale935 cas passe sans échec. La campagne native historique
native-opencode.test.mjs a été invoquée par erreur avec OpenCode2.2 et a expiré ;
le banc V2 de référence documenté native-opencode-codemode.test.mjs a ensuite
réussi1/1. Ce timeout n’est pas présenté comme une réussite.

## Bilan documentaire

| Document | État et justification |
|---|---|
| AGENTS.md | Inchangé : autorité et délégation existantes, mandat explicite ci-dessus. |
| PROJECT.md | Mis à jour : les deux frontières et leur autorité bornée. |
| TECHNICAL.md | Mis à jour : distinction coordination/permission et référence détaillée. |
| BUILD.md | Mis à jour : version et mêmes artefacts, aucune dépendance ajoutée. |
| DEVOPS.md | Relevé DIU existant conservé, outils Python/OpenSpec/OpenCode référencés utilisés. |
| DEVELOPMENT_MAP.md | Amendement ciblé du change ; aucun lot définitif ni reconstruction globale. |
| README.md | Mise à jour des capacités2.2.5 et limites de preuve. |
| CHANGELOG.md | Entrée2.2.5, restauration sans décision et terminal sans once fabriquée. |
| openspec/specs/ | Trois exigences nouvelles synchronisées à l’archivage. |

Publication, activation et application propriétaire restent des observations
séparées ; les tests source ne déclarent aucun RUN métier terminé.
