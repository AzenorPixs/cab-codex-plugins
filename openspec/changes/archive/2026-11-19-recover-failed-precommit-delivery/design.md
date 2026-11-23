# Conception

Le dispatch existant session.delivery.policy conserve sa politique de publication habituelle et admet les actions strictes inspect_precommit, resume_precommit et status_precommit pour l’administrateur système local authentifié uniquement. Aucun transfert implicite de SID ou privilège client.

L’inspection ne modifie rien : elle observe livraison/RUN/SID/génération/acteur, état autorisé WORKING ou FINALIZATION_PENDING, projet/racine/UID, politique/cadrage/source native/révision, HEAD/branche/base, index/empreinte, réservations, index partagé, version locale/projection et reçus. Le cas admissible est PARTIAL avec commit FAILED rebase-conflict connu avant déplacement des références, effet original FAILED sans reçu d’effet, aucune étape aval émise, aucun bail/opération ou effet indécis. Le PID d’un service vivant n’est pas assimilé à un thread actif.

La reprise exige le CAS exact et un request_id stable. L’événement immuable conserve le snapshot FAILED et le reçu d’origine ; GitSessionEffect original reste inchangé. Une nouvelle demande de commit corrélée est créée. Seule la projection courante du step commit passe à RUNNING ; le contrôle générique des étapes n’autorise toujours pas FAILED→RUNNING. Les champs de version et la projection restent inchangés.

Avant tout prepare/effet, le worker reprend le même verrou Git et réobserve intégralement le contexte admis, en normalisant seulement ses propres transitions RUNNING corrélées. Une divergence après admission refuse le commit. Une réponse perdue impose status avec le même request_id ; une répétition identique ne lance aucun autre worker. UNKNOWN reste protégé.

Le rebase utilise HEAD comme arbre de départ. Les scalaires de version sont reconnus dans les formats standard JSON/TOML/Python/frontmatter/heading SKILL ; tous les autres octets et données parsées doivent être identiques à HEAD et le mode doit correspondre. Les structures inconnues sont refusées comme métadonnées. Les autres fichiers restent soumis au 3way normal.

Une résolution de code ne vient jamais d’un choix ours implicite : elle déclare explicitement le chemin réservé, les OID/modes HEAD et staged et le SHA256 du diff, plus les références de revue propriétaire/responsable et leur digest. Elle est vérifiée au CAS puis appliquée au seul index candidat par contexte de tentative isolé au thread. Tout autre conflit reste refusé. Un chemin devenu sans delta n’est accepté que si son blob ET son mode correspondent déjà à HEAD.

La continuation extraite est commune au parcours normal et à la reprise : forges, builds, releases différées applicables, vérifications, retrait de l’index et preuve de publication. Elle ne contient aucun appel de mutation de version/projection.

## Qualification et activation

Le prototype isolé a été qualifié avec 18 tests, dont deux admissions concurrentes sur connexions PostgreSQL distinctes, un parcours normal complet, des conflits réels, des réponses perdues, des divergences après admission, et les refus UNKNOWN/bail/état de RUN/résolution non approuvée. Les fixtures sont annulées ou nettoyées après le seul cas concurrent commis.

Un corpus réel a été vérifié dans un objectstore/index temporaires, avec objets du dépôt réel en lecture seule. Les métadonnées seules ont refusé quatre vrais conflits ; leurs deltas exacts ont été relus par leur propriétaire et CCAB avant admission manuelle. Aucune source, index ou référence réelle n’a été modifié par cette qualification.

Le bootstrap qualifié a été activé en maintenance sur la base du paquet installé, avec manifeste privé et empreintes CAS, redémarrage explicite et vérification avant inspection API. Après la reprise unique, l’installation du paquet livré a remplacé son module public et le helper non empaqueté a été retiré sous CAS. Ses reçus et sources qualifiées sont conservés ; ils ne sont pas une preuve de livraison du correctif durable. Le report intégral et la nouvelle qualification source précèdent sa livraison.
