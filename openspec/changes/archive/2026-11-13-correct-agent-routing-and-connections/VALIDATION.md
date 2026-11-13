# Validation SCM CAB3.0.4

## Mandat et identités
SCM avec CI/CD explicitement demandé ; mode direct. RUN SCM-agent-routing-304,
SID01a1c9e3-bed3-7a52-abca-0ea08eaa71d9. La décision du développeur confirme
PROJECT_ID=pixs et l’adresse /projects/pixs. Les PK internes, SID, RUN, acteurs,
générations et anciens liens sont conservés. Aucun autre change n’est repris.

## Qualification observée le13novembre2026
-42tests Python réussis sur la fixture PostgreSQL ;7tests ciblés observation,
 releases et identifiants repassés après le dernier ajustement de taille GitHub.
-17fichiers Python modifiés/nouveaux : syntaxe vérifiée. TypeScript/Vite réussi.
 Django check sans anomalie ; makemigrations --check --dry-run sans changement.
 Les27spécifications canoniques et le change courant passent en mode strict.
-Migration0007 appliquée sur la fixture :8identifiants métier renseignés, PK et
 données des RUN préexistants inchangés. Doublons/identifiants ambigus laissés
 vides ; aucune affectation project.env n’est exécutée ou restituée.
-Chromium156.0.8078.79 et Firefox153.7.0 : trois programmes, navigation Agents,
 redirections anciennes, adresse métier, colonnes étape/tâches, détail RUN,
 onze étapes, six tâches dont trois cochées, mobile et projection Electric
 existante vérifiés. Les configurations privées ne sont pas affichées.
-Inventaire source sur l’hôte : OpenCode2.2.7 et Codex intégré0.167.0-alpha.4.1
 ont leurs connexions MCP réelles reconnues ; Codex CLI0.167.2 reste distinct.
 Les sockets Unix sont rapprochées par inodes et filiation, sans lire les flux.
-Le vrai endpoint GitHub des releases OpenCode renvoie2.2.7 dans le canal majeur2.
 Sa réponse dépasse4Mio ; limite bornée portée à16Mio, puis appel réel réussi.
 Consultation quotidienne aléatoire conservée ; un cache Codex commun suffit.
-CLI Codex natif en profil isolé : installation des intégrations3.0.4 et
 préservation des paramètres tiers réussies, réparation de cache et idempotence.
 Le payload candidat et le postinst ont été qualifiés en fixture.

Preuves techniques non versionnées : output/scm/cab-3.0.0/*304*.log et
monitor-304-browser-proof.json. Les résultats de livraison/activation ne sont
pas déduits de ces tests source ; ils seront contrôlés sur le paquet final.

## Préservation et limites
Sauvegarde privée préalable sous /var/backups/cab/pre-304-20261113 : dump,
configuration et état ; trois empreintes vérifiées. Admission temporairement
suspendue puis réouverte, sans arrêt des agents natifs. Aucun effet inconnu
n’est rejoué, aucune restauration automatique n’est prévue.

La référence AGENT_INTEGRATIONS.md reste absente du socle : aucune politique
n’est inventée ; mandat explicite et contrat CAB distribué appliqués. Le relevé
DEVOPS.md préexistant est inclus. Modèle, tokens, coûts et durées natives non
exposés restent N/A ; aucun comptage rétroactif n’est fabriqué.

## Cohérence documentaire et livraison attendue
PROJECT.md, TECHNICAL.md, BUILD.md, README.md, CHANGELOG.md et les opérations
décrivent3.0.4 ; cartographie et registre amendés uniquement pour ce change.
Règles du socle et dépendances inchangées. L’archivage synchronise le delta
system-platform ; rapport individuel SGS, DELTA conditionnel, livraison DIU,
qualification du DEB et activation sur l’hôte restent des contrôles distincts.

Rapport individuel SGS généré et vérifié (six sections). DELTA global refusé :
couple/contrat historique incompatible ; agrégat préservé sans reconstruction.
Le mandat encadre openspec/changes globalement : la relocalisation ciblée
run.reconcile_archive a été refusée sans effet (source non cadrée séparément) ;
aucune réécriture du mandat ou identité de substitution.
