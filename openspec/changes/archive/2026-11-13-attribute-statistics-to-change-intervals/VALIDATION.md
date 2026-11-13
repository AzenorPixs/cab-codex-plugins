# Validation SCM CAB3.0.6

## Mandat et décisions
Demande explicite de statistiques propres au change, avec début/fin. Choix du
développeur : un change mesuré à la fois par SID, bascule autonome du codeur.
Complément explicite : un change peut réunir plusieurs RUN et sessions.
RUN SCM-change-statistics-306, SID01a1c9e3-bed3-7a52-abca-0ea08eaa71d9 ; mode
direct, source native liée sans remplacement d’identité. Livraison SCM/DIU/CABU
dans la continuité du mandat. Aucun test métier DIU n’est lancé par cette session.

## Preuves observées le13novembre2026
-25tests Python de fixture PostgreSQL réussis :10mesures nouvelles et15régressions
 ciblées liaison native/réconciliation. Même SID/deux changes, compteurs100→130→180,
 reçus répétés, reprise, contraintes SQL d’exclusivité, reset, source différente,
 champs absents, OpenCode en cours et messages dupliqués vérifiés.
-Un change sur3RUN/2SID cumule65tokens d’écarts ; aucun total natif antérieur
 n’est repris. Les périodes simultanées donnent200secondes actives par union,
 sans addition des temps simultanés. Un début tardif ne valide pas la couverture.
-API publique complète du candidat en fixture : deux RUN d’un même SID,
 native.bind explicite, statistics.begin/end/change et metrics ;30puis50tokens,
 frontière commune, reçu répété inchangé, contribution SGS validée.
 Premier essai avant disponibilité du serveur refusé ; attente de santé en
 lecture seule ajoutée au test, puis parcours complet réussi. Aucun retry
 automatique de mutation n’est introduit.
-Migration0008 appliquée sur PostgreSQL de fixture : deux tables ajoutées,
 sans modification des identités existantes. Django check sans anomalie et
 makemigrations --check --dry-run sans changement.
-py_compile réussi sur15fichiers Python modifiés/nouveaux ; TypeScript/Vite
 réussi ;27spécifications canoniques et delta courant valides en strict.
-Payload Python préparé comparé octet à octet aux sources : identique.

Journaux techniques non versionnés : output/scm/cab-3.0.0/*306*.

## Couverture et limites
Les valeurs sont les incréments de compteurs natifs observés entre instantanés.
Les bornes serveur et natives sont exposées ; aucune interpolation à l’intérieur
d’un événement natif, attribution certaine d’événement tardif ou mesure absente
n’est inventée. Source/compteur divergents, données natives en cours ou champ
absent donnent N/A. Les anciennes valeurs Metric sont diagnostics session-wide
et ne sont plus renvoyées comme métriques du change/RUN.

Un début réellement antérieur au codage est attesté from_coding_start=true par
le codeur, sans validation d’orchestrateur. Une entrée tardive utilise false.
Sans attestation pour chaque RUN et fermeture des périodes, le total SGS reste
inconnu ; les mesures partielles restent consultables. Le présent correctif
ayant commencé avant activation3.0.6, ses compteurs natifs complets restent N/A.
Aucune rétroactivité sur les sessions déjà actives.

## Préservation et documentation
Sauvegarde privée /var/backups/cab/pre-306-20261113 : trois empreintes vérifiées,
barrière d’admission annulée ensuite, sans arrêt des clients natifs. Références
de tête, changelog, opérations, schéma SGS et intégrations distribuées actualisés.
Cartographie/registre limités au change courant. AGENT_INTEGRATIONS.md demeure
absent ; aucune règle inventée, mandat explicite et contrat CAB appliqués.

L’archivage et le rapport individuel ne prouvent pas la CI/CD ou l’activation.
Paquet final, migration hôte, profils/RUN et parcours réel seront vérifiés après
publication. Le DELTA SGS historique ne doit pas provoquer de reconstruction.

Après ajout de données par le parcours public, trois assertions de fixture
utilisaient des lectures globales de périodes. Elles ont été bornées au projet
synthétique du test ; aucun état tiers n’est utilisé ou modifié par ces assertions.

Rapport individuel SGS généré et vérifié, six sections UTF-8/LF. DELTA global
refusé pour contrat historique incompatible : agrégat préservé sans reconstruction.

## Qualification réelle et correctif3.0.7
La3.0.6 a été publiée et installée (decd29a6), PostgreSQL23migrations et Electric
vérifiés,28RUN et profils préservés. Sa période de qualification pointait un ancien
journal, inchangé depuis11novembre. L’index natif du seul SID désigne un journal
suffixé de reprise, même SID/UID/cwd, avec compteurs récents. Aucune consommation
réelle nulle n’est déduite du compteur ancien ; les totaux du présent change
restent N/A faute de couverture depuis l’entrée en codage.

Le correctif3.0.7 appartient au même mandat/change : index lu sous l’UID réel et
sans autre conversation, reprise contrôlée et historique de liaison ; gardes de
fraîcheur à l’écriture et à la lecture des périodes. La résolution réelle sous
UID codeur, exécutée depuis un processus root avec privilèges abaissés, a vérifié
l’en-tête de la source indexée. Les identités et anciens reçus sont conservés.
Les tests couvrent aussi un codeur OpenCode piloté, sans aval d’orchestrateur ;
la recette réelle d’une session OpenCode pilotée reste distincte et non exécutée.

Complément3.0.7 :30tests ciblés réussis, dont index SQLite synthétique et reprise,
compteur ancien distinct de zéro et codeur OpenCode piloté sans aval du parent.
Syntaxe :19fichiers du change complet contrôlés ; TypeScript/Vite réussi.
