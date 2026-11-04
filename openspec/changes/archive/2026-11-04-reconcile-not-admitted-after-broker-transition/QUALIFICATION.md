# Qualification SCM — CAB 2.2.20

4 novembre2026, Europe/Paris. Code non attribué ; ACL ultérieure.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur, registre, preuves, client, distribution et CABU | 666 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 762 | 0 | 0 |

Après la dernière garde de contradiction APPROVED/NOT_ADMITTED,58 tests
concernés ont été réexécutés avec succès ; ils sont inclus dans666, sans
addition. Le test de contradiction renforcé échoue avant la garde puis passe.
La première campagne avait3 écarts : attente409 obsolète pour readiness absente,
legacy explicitement déclaré à distinguer de l’absence, budget du routeur.
Le code conserve409 legacy, le test d’absence exige503 sans permission,
et le routeur a été raccourci sans relever ses seuils ; aucun échec résiduel.

La régression HTTP couvre première notification et retry d’une demande déjà
admise pendant une readiness absente, même identité conservée, puis reprise
sans effet après readiness. Le broker conserve PENDING sur503 structuré.
Le retrait couvre un request_validation natif Code Mode en erreur scellée,
get_approval NOT_ADMITTED complet/frais, CANCELLED sans décision/accès/native/
result/once, reçu identique après redémarrage et nouvelle demande distincte.
PENDING, preuve étrangère/périmée, effet, accès, décision et frontière divergente
sont refusés. Une permission tardive ne reçoit aucune once.

La forme réelle historique de PA01 a été reconnue en lecture seule avec son
horodatage d’observation : ce contrôle de forme n’est pas une preuve fraîche
pour muter le RUN. L’orchestrateur doit refaire get_approval après activation.
Aucune décision, accès, once, session ou fichier Pixs n’a été manipulé ici.

Syntaxe :60Node et12Python,72 fichiers ; py_compile avec cache privé.
UTF-8/LF, commandes/skill sous4000octets et commande+status sous10000.
OpenSpec20/20 avant archive ; sources broker dupliquées concordantes.
Logs privés /home/ade/.codex/.tmp/cab-2220-{node-final,affected-final,python,native,spec-before}.log.
Publication et activation restent des preuves distinctes postérieures.
