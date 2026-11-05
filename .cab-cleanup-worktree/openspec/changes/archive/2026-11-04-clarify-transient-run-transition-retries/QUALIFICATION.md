# Qualification SCM — CAB 2.2.22

4 novembre2026, Europe/Paris ; code non attribué.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node concurrence HTTP, diagnostics, distribution, coordination et CABU | 526 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 622 | 0 | 0 |

La première campagne Node a donné525 réussis/1échec : elle avait chargé le
manifeste de migration avant son actualisation. Après gel des documents et
recalcul des seules empreintes de destination, les deux fichiers de tests de
distribution ont été réexécutés avec succès ; les résultats remplacent ceux
des mêmes tests, sans les compter deux fois. Logs privés :
/home/ade/.codex/.tmp/cab-2222-{node,routing,python,native,spec-before}.log.
Aucun moteur ni test existant n’a été assoupli pour obtenir ce résultat.

57 fichiers runtime distribués sont identiques au paquet2.2.21 après
normalisation du seul numéro de version. Contrôles syntaxiques70fichiers
(59Node/11Python), UTF-8/LF et droits projet0775. Les trois brokers src et
plugin concordent.226liens relatifs de skill/références contrôlés.
Skill3910octets, commande3549octets, commande+status9932octets ; budgets respectés.
La grille contient57situations, dont les deux transitions et le mélange d’IDs.
Le validateur générique skill-creator signale le nom canonique existant CAB en
majuscules ; il ne valide donc pas ce nom selon sa convention générale.
Le nom public du plugin est conservé ; les tests de distribution du projet
vérifient le contrat existant. Aucun nouveau test textuel en miroir ajouté.

Les tests HTTP existants prouvent BUSY, refus409 précoce et400 tardif sans
nouvelle décision/once, puis même demande après stabilisation ; les gardes
de révision et l’isolation du RUN voisin restent testées. La revue du routage
POST confirme le refus avant traitement de locks/acquire. Aucun effet Pixs
n’a été exécuté pour qualifier ce correctif documentaire.

Lecture GET réelle : l’APPROVED fa2152dc… portait l’édition profile-target… ;
le test profile-test… avait requestId fe867385… indécis. Le propriétaire a
confirmé et retiré sa conclusion de divergence. Ceci est un diagnostic d’IDs,
pas un résultat du test métier. Le correcteur n’a muté aucun RUN/accès/once.
OpenSpec strict20/20 avant archivage ; publication et activation distinctes.
