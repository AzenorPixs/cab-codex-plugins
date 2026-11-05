# Qualification SCM — CAB 2.2.13

2026-11-03. Code non attribué ; attribution ACL ultérieure.

## Périmètre et preuves

API distincte, registre PREPARED/COMMITTED/DONE/ABORTED, checkpoint atomique,
révocation des permissions historiques et observation séparée. Le transfert
ordinaire et les protections d’accès restent stricts. Aucun RUN Pixs modifié.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node cœur, gardes, contexte et continuité | 254 | 0 | 0 |
| Compatibilité updater, distribution, port et permissions | 112 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode 2.2.5 réel, fournisseur synthétique | 1 | 0 | 0 |
| Total unique | 461 | 0 | 0 |

Cœur242 plus12 cas supplémentaires uniques (modèle et continuité) ; les
relances resource/context ne sont pas additionnées. Compatibilité111 succès
initiaux et un contrôle d’empreinte documentaire corrigé puis revalidé :112.
Logs locaux : /tmp/cab-2213-core.log, final-guards.log, model-final.log,
compat.log, distribution-final.log, python.log et native-qualified.log sous
le même préfixe /tmp/cab-2213-. Syntaxe62Node et11Python exécutée ; UTF-8/LF
et diff --check vérifiés. OpenSpec strict20/20 avant archive.

## Cas établis

Ancien once et accès inchangés, nouvelle opération disjointe avec once neuf,
recouvrement WAITING, ancienne permission interdite, ancien SID réservé à
l’historique, owner étranger, intention incertaine et inventaire divergent
refusés. PREPARED persiste avant SID ; COMMITTED survit au redémarrage ;
réparation du checkpoint après redémarrage idempotente, divergence refusée.
Abandon avant commit seulement. Session occupée, permission, native allow,
readiness non scellée/ancienne, outil métier, PID absent et modèle divergent
refusés sans changer le job.

La fixture native utilise l’API HTTP réelle avec CodeMode scellé, même RUN/job,
ancien edit divergent APPROVED et accès conservés. DONE puis rejeu identique,
PID OpenCode conservé ; mise à jour de transport certifiée après handoff et
redémarrage restaurent le reçu et le SID sans nouvel appel fournisseur ni
permission. Ressources et réservations du pair inchangées.

## Échecs intermédiaires résolus

Le premier test natif envoyait null au lieu du contrat string vide de
job/progress : fixture corrigée, pas de modification du contrat existant.
OpenSpec signalait un paragraphe trop long : préconditions déplacées dans
un scénario. Le contrôle de couverture documentaire détectait les empreintes
précédant le bump : seules les destinations courantes ont été recalculées,
les sources et segments historiques ont été conservés. Relances finales
réussies ; aucune panne produit déclarée sur ces constats.

## Limites

Aucun transfert métier C12 effectué par la qualification. Publication puis
CABU et bascule par le propriétaire sont distinctes. Après utilisation du
journal étendu, aucune restauration par une ancienne version non compatible.
Le cas write refusé signalé par C12 est distinct ; il n’est pas transformé en
preuve de retrait, résultat natif, once ou NO_EFFECT par ce handoff.
