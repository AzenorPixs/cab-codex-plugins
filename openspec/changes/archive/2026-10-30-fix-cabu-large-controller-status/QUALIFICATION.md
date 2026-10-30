# Qualification — lecteur de statut CABU, build corrigé2.1.15

Le mandat humain de rétablissement normal autorise le correctif ciblé. La réponse réelle /status a été mesurée à2327337octets ; les services répondaient, mais le lecteur2Mio refusait le statut, ensuite masqué par l’attente de démarrage. La base2.1.15 reste conservée avec un nouveau build+codex afin de reprendre sans conflit d’artefacts le journal non terminal update-44f9925d-c49e-471b-8920-55abb73378be. Aucune édition manuelle du journal, aucune purge ou donnée métier restaurée.

## Vérifications

48/48 tests updater passent sur HTTP réel : réponse3Mio, exactement16Mio, au-delà16Mio refusé avec update-response-too-large, snapshot moniteur au-delà2Mio toujours refusé. Node global576 :548 réussis,28 ignorés,0 échec ;84,283s. Un premier global avait un timeout transitoire de démarrage2s d’une fixture de récupération ; le test isolé inchangé puis le global entier ont réussi, sans modification du test ni de son timeout. Les preuves Python80/80 et banc natif privé1/1 du correctif précédent sont conservées : les fichiers Python, client et contrôleur ne sont pas modifiés par ce complément. Les trois hashes broker sont vérifiés contre beforeHash/afterHash du journal à reprendre. Syntaxe des deux JavaScript modifiés vérifiée ; textes UTF-8/LF. OpenSpec17/17 standard et strict avant archive.

## Cohérence et périmètre

Updater : seuls GET exacts /status et /runs acceptent16Mio comptés avant parsing. Les autres réponses restent2Mio et le client OpenCode n’est pas modifié. Le dépassement est propagé sans attendre inutilement ni masquer son diagnostic. Aucun modèle, mandat, permission ou once modifié.

AGENTS/PROJECT/DEVOPS et ORCHESTRATED_CODING.md restent inchangés ; les règles générales, architecture, environnement généré et protocole ne nécessitent pas de modification. TECHNICAL/BUILD/README et component-update.md décrivent l’exception ciblée, CHANGELOG complète2.1.15. Les identifiants officiels de distribution et les preuves historiques sont conservés ; aucun projet consommateur nommé. Les commandes CAB/CABU/cab gardent leurs contenus2.1.15 identiques et leur référence vers component-update. Seuls les deux manifestes reçoivent un nouveau cachebuster. OpenSpec modifie une exigence de maintenance et ses scénarios ; les autres capacités restent inchangées. Map/BATCH reçoivent seulement l’entrée de ce change sans attribution de code.

## Sources et activation

Preuves : output/scm-cabu-large-status/{targeted.log,node-global.log,node-initial-global.log,recovery-isolated.log,source-verification.json,openspec-before-standard.log,openspec-before-strict.log}. Les sources sont éligibles à archivage. La reprise CABU doit d’abord vérifier le rollback du journal conservé puis les versions actives et la readiness. Les demandes interrompues restent à réconcilier par leurs propriétaires ; aucune réussite runtime n’est déduite des sources.

Archive réussie :2026-10-30-fix-cabu-large-controller-status ; contrôles après synchronisation16/16 standard/strict et bloc normatif identique. Six sections et liens ciblés vérifiés, aucun bilan de blocage à nettoyer.
