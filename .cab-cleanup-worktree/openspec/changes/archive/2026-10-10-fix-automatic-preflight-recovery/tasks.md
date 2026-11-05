## 1. Spécification

- [x] 1.1 Définir les écarts admissibles, la continuité et les refus de sûreté.
- [x] 1.2 Valider le change OpenSpec avant toute écriture de protocole ou test.

## 2. Protocole et distribution

- [x] 2.1 Aligner le protocole local, /cab, la skill et la référence de purge.
- [x] 2.2 Synchroniser les cadrages, README et CHANGELOG concernés.
- [x] 2.3 Aligner les briques CAB sur 0.87.1 et vérifier leur cohérence.

## 3. Validation et archivage

- [x] 3.1 Couvrir omissions, refus, répétition sûre et gardes dans les tests.
- [x] 3.2 Exécuter syntaxe, suites Node/Python, OpenSpec et contrôles de périmètre.
- [x] 3.3 Vérifier la matrice documentaire et l'éligibilité de ce seul change à l'archivage.

## 4. Clôture après acceptation

L'archivage et la publication de STATISTIQUES.md sont deux opérations distinctes
à prouver après leur réalisation ; les cases précédentes ne les anticipent pas.
Ce seul change doit être archivé avec synchronisation des deux capacités.
Le rapport doit ensuite présenter six sections, UTF-8/LF, des totaux contrôlés
et N/A motivé pour les mesures non collectées en SCM direct, sans sondes.

## Preuves avant archivage

- OpenSpec strict avant code et après code : réussi.
- Tests Node ciblés : 24/24 ; suite Node complète : 44/44.
- Suite Python complète : 38/38 avec Python DevOps, repli déclaré par DEVOPS.md.
- Trois compilations Python et quatre contrôles de syntaxe Node distincts : réussis.
- Contrôle des six versions, JSON du plugin, UTF-8/LF et périmètre : réussi.
- Les trois changes historiques restent byte-identiques à leurs empreintes.
- Broker, contrôleur, superviseur, pyproject et les deux tests Python ne
  changent que par les valeurs de version ; APIs, schémas et gardes conservés.
- Échecs intermédiaires corrigés : scénarios canoniques omis au premier delta,
  deux assertions de version Python anciennes et indentation d'une assertion.
  Le venv annoncé était absent au chemin attendu ; aucun paquet installé.
- Aucun test réel OpenCode, déploiement, purge réelle, opération Git ou appel
  fournisseur. Les tests de récupération HTTP utilisent des services simulés.

## Matrice documentaire limitée au correctif

| Élément | État et preuve |
| --- | --- |
| Projet réel | Protocole distribué aligné et 82 tests rapportés dans les suites complètes finales ; aucune activation runtime |
| AGENTS.md | Inchangé, empreinte vérifiée ; §7 distingue SCM direct et pilotage, rapport d'archive obligatoire |
| ORCHESTRATED_CODING.md | Section de récupération alignée sur /cab et la skill ; identité locale corrigée de Pixs vers CAB |
| PROJECT.md | §7 Résilience mis à jour pour écarts admissibles et continuité du RUN |
| TECHNICAL.md | §3 version 0.87.1 et §7 exception automatique orchestrée ; contrat /job/recover conservé |
| BUILD.md | §6 contrôles de distribution/récupération et §7 version alignés ; déploiement distinct |
| DEVOPS.md | Inchangé, inventaire généré ; chemins Node/Python/OpenSpec utilisés, absence du venv signalée et repli déclaré appliqué |
| README.md | Description de l'exception et version 0.87.1 alignées, automatisation attribuée à l'orchestrateur |
| CHANGELOG.md | Entrée Unreleased dédiée au correctif et à 0.87.1, sans date de publication inventée |
| openspec/specs/ | Deux deltas validés puis propagés par l'archivage ; validation finale détaillée ci-dessous, sans modification des trois changes historiques |

## Preuves après archivage

- Archivage exécuté une seule fois avec --yes --json, exit0 :
  2026-10-10-fix-automatic-preflight-recovery, specsUpdated=true,
  cinq exigences modifiées dans deux capacités, aucune exigence supprimée.
- Le contrôle global strict a signalé 17 WARNING de longueur et zéro ERROR.
  Les détails de quatre blocs de ce correctif ont été déplacés dans leurs
  scénarios, dans le canon et les deltas archivés, sans perte de scénario ni
  modification de comportement. Aucun réarchivage.
- Après correction : 13 WARNING sur exigences non modifiées, zéro ERROR.
  Les tuples capacité/niveau/chemin/message sont identiques à ceux de la
  fixture antérieure ; ses deux fichiers reconstruits correspondent exactement
  aux empreintes prises avant modification. Le strict global reste exit1,
  passé=1/7 ; il n'est pas présenté comme réussi.
- Validation globale sans --strict : exit0, 7/7 valides avec ces 13 WARNING.
- Copie exacte isolée des deltas archivés : validation du change --strict,
  exit0, 1/1 valide, issues[]. Aucun nouveau warning de ce correctif.
- Les suites finales restent 44/44 Node et 38/38 Python ; les corrections
  post-archive ne touchent que la présentation des exigences et leurs preuves.
- Le rapport STATISTIQUES.md reste une production distincte, vérifiée après
  son écriture ; aucune mesure de pilotage n'est reconstituée en SCM direct.

## Preuve du rapport

STATISTIQUES.md est présent dans cette archive : six titres de niveau 2,
UTF-8/LF, 26 chemins distincts et totaux recoupés (82 tests finaux ; journal
partiel de 24 validations, 16 exit0 et 8 résultats non nuls qualifiés).
SHA-256 : 8ccd8bffffce4517ae4362cf7d5ada5fbe57dd158ce1ef8e50b8dc38750a0aab.
Le quota, les tokens, les coûts et les sondes restent N/A motivés en SCM.
Le rapport est produit sans réarchivage, déploiement ni reprise du RUN Pixs.
