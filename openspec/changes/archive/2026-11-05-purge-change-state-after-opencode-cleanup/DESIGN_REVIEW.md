# Revue technique — purge terminale par change

## Inventaire de couverture

| Couche | Données à inventorier et retirer de la cible | Partagé à préserver |
|---|---|---|
| Contrôleur | RUN/job/contextes, validations/décisions, requestOwners, opérations, accès/baux libérés, policies/reçus, stages/payloads, shell lifecycle, extensions, statistiques/observations ciblées | autres contextes/ressources et compteurs globaux anti-rejeu |
| Broker | approbations, aliases/IDs, journal et checkpoint, registres de remédiation, watchdog/reconciliation et index/mémoire ciblés | demandes des pairs, clés/configuration du profil |
| Superviseur | contexte et supervisor-state par RUN, dernier mandat/jalon/reprise, projections/caches | contextes/polling des pairs |
| Moniteur | snapshot courant/dernier valide, événements retenus, caches/statistiques/projections ciblés | données et flux des pairs |
| OpenCode | sessions source, handoffs, sondes et statistiques reliées au périmètre, descendants qualifiés | sessions étrangères/parents communs non propriétaires |
| Héritages/sauvegardes gérés | anciennes copies runtime, transactions et backups contenant encore les données de la cible | fichiers d’autres RUN et credentials globaux |

Les chemins effectifs viennent des identités/configurations observées, jamais
un glob global du home ni une lecture d’environ/cmdline/secrets. Les paths de
base sont runtimeStateDirectory exposé par /status, racines broker configurées,
et racine monitor propre au workspace. Les stores communs observés dans le
code comprennent controller-runs.json, recovery-policies.json, shell-stages.json,
shell-lifecycle.json, manifest-extensions.json, protocol-observations.json,
protocol-efficiency.json et les contextes runs/<run>/<context>.

La sélection combine changeId canonique, RUN/contexte/version, jobs et identités
collectées. Ne pas effacer un contexte d’un autre change qui réutilise un nom.
Une référence d’un pair encore nécessaire ou une propriété ambiguë bloque la
purge et est décrite ; elle n’autorise ni suppression globale ni faux succès.
Les fichiers métier OpenSpec, archive, BLOCKERS/statistiques et preuves du projet
sont hors purge CAB et restent au propriétaire selon le prompt.

## Automate proposé (noms conceptuels, pas API publiée)

1. INVENTORIED : empreinte d’un inventaire fermé et propriétaire identifié.
2. SAFE_RUN_CLOSED : branche A/B prouvée, gate validé, job désarmé, ressources
   réconciliées/libérées, aucun effet inconnu. Les rejets sans émission doivent
   disposer d’une retraite qualifiée AVANT gate, en conservant leurs reçus.
3. OC_CLEANED : inventaire des sessions/descendants, exclusion des sessions
   étrangères, suppression native contrôlée, relecture de leur absence et
   des permissions. Dans B, l’unique session métier prévue par le prompt reste
   native ; son SID est conservé seulement dans le checkpoint métier hors CAB.
   Vérifier sa présence et empêcher toute cascade qui l’emporterait.
   Garder l’historique nécessaire jusqu’au point2.
4. CAB_PURGING : intention durable bornée, contrôle des empreintes et de
   l’absence de nouvelles références, adapters par composant et ACK mémoire.
   Les autres RUN continuent selon leurs ressources ; aucune purge globale.
5. ABSENCE_VERIFIED : contrôles des stores, indices, caches/mémoires, snapshots,
   sauvegardes gérées et références ciblées. Les backups temporaires de reprise
   sont supprimés après commit sûr ; rien n’est conservé par défaut sur la cible.
6. PURGED : résultat remis au propriétaire pour son compte rendu hors CAB,
   retrait du propre reçu/manifest/transaction CAB contenant la cible. Une
   réponse perdue doit pouvoir être reprise/vérifiée par certificat externe
   borné et clé/époque globale, sans tombstone par change conservée indéfiniment.

Les noms fonctionnels tels que CISMP5 peuvent redevenir disponibles après
cette dernière preuve. La reprise d’un change BLOQUÉ utilise son dossier métier,
les nouvelles dépendances disponibles et de nouvelles demandes/opérations,
avec le SID métier conservé ou une nouvelle session selon le prompt, sans
transfert d’une ancienne once. Garder uniquement une époque/sequence
partagée ne contenant aucun identifiant de change pour empêcher les replays.

## Décision du développeur : journal commun

État actuel : approval-persistence/spec.md, Requirement Journal vérifiable :
« CAB SHALL consigner les transitions métier dans un journal append-only
chaîné par SHA-256. » Le module journal est en version3 et vérifie le
checkpoint authentifié. Il ne fournit pas de retrait ciblé compatible avec
la chaîne actuelle. La réinitialisation existante est globale et ne peut
servir à nettoyer un change pendant que les pairs existent.

Option retenue explicitement le 5 novembre 2026 : effacement total avec réancrage.
Compactage/migration authentifié, suppression des
événements cibles, préservation exacte des payloads/IDs des événements des
pairs, recalcul/partition du chaînage et nouveau checkpoint. Aucun placeholder,
copie ou sauvegarde cible après succès. Les anciens scellements de chaîne
commune changent ; la preuve de migration doit vérifier les pairs et le crash.
Une évolution cloisonnée par change rendrait les purges suivantes indépendantes,
mais exige d’abord une migration du format partagé.

Le maintien de la chaîne historique avec empreintes de la cible est écarté.
Le choix validé ne transforme aucun état technique incertain en clôture sûre.

Une absence via les API/roots CAB gérés ne prouve pas l’effacement forensic
du disque, des snapshots OS, du fournisseur LLM ou des conversations Codex
externes. Le périmètre certifié et ses limites doivent être nommés ; ne pas
étendre une purge à ces systèmes ou aux autres changements silencieusement.

## C12 aujourd’hui : préconditions non remplies

L’opération .03 reste une once acquittée sans résultat natif, port HELD et
preuve d’instance antérieure non qualifiée dans le contrôleur courant. Le reçu
historique d’un autre PID ne doit être ni antidaté ni substitué au PID actuel.
Cette condition relève d’une voie de réconciliation d’effet, pas d’un cleanup.
Le change métier archivé n’autorise donc pas encore OC_CLEANED ou CAB_PURGING.
Les cinq PREPARED/REJECTED nécessitent une voie typée de retraite sans émission,
pas une annulation générique ; un prototype sans accès n’est pas un effet réussi.

## Matrice de qualification à couvrir

- A et B complètes : OC effacé avant toute suppression CAB, preuves métier préservées.
- UNKNOWN/EXECUTING/once sans résultat/permission/bail actif : zéro suppression.
- OC encore présent, descendant étranger, preuve de propriété incertaine : refus.
- Rejets terminaux sans émission : retraite qualifiée, anciennes décisions inchangées.
- Tous les composants et copies gérées : aucun sélecteur cible après réussite.
- Pairs actifs : données et permissions inchangées, aucune nouvelle once.
- Journal : intégrité avant/après, migration/compaction conforme au choix validé.
- Crash à chaque phase, réponse perdue, reprise du même identifiant, certificat externe.
- Refus de symlink/paths étrangers/inventaire périmé/référence externe encore nécessaire.
- Réutilisation du nom humain avec identités/époque nouvelles, rejets des anciens replays.
