# Statistiques — CAB 2.2.10

## 1. Statistiques générales et décisions

SCM directe, archive2026-11-03-journal-rejection-of-multipart-shell-permissions.
Mandat :correctif, incrément, publication, CABU puis remontée aux sessions.

| Mesure | Valeur |
|---|---|
| Date | 2026-11-03 |
| Tests finaux uniques | 331 réussis,0échec,0ignoré dans le périmètre |
| Tâches terminées | 3 |
| Syntaxe modifiée | 72fichiers :61Node et11Python |
| Modèle/raisonnement, bornes globales, durée totale | N/A — export exhaustif absent |
| Tokens, cache fournisseur et coût | N/A — métriques de production absentes |

Un succès d’outil ne prouve pas une approbation humaine. Erreur technique et
refus de permission restent distincts. Pourcentages de messages et outils :
N/A — dénominateurs exhaustifs absents.

## 2. Types de messages et d’outils

Lecture ciblée, édition, tests Node/Python/OpenCode, OpenSpec, Git SCM,
publication et CABU. Aucun agent délégué ;aucune décision ou opération Pixs.
Totaux exhaustifs des messages/appels :N/A.

## 3. Fichiers modifiés

Client V2, tests multipartis et natifs, références de protocole, versions,
OpenSpec et qualification. La procédure de rejet est canonique dans
reprise autonome ;les autres références y renvoient pour éviter la duplication.
Aucune dépendance ni variable ajoutée. Inventaire exact :commit SCM.

## 4. Commandes et validations

| Vérification finale | Réussites | Échecs | Ignorés |
|---|---:|---:|---:|
| Node client et récupération | 91 | 0 | 0 |
| Node paquet et continuité | 145 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode réel V2 | 1 | 0 | 0 |
| Total unique | 331 | 0 | 0 |

Client318ms ;paquet29553ms ;Python4529ms ;natif9766ms, fournisseur synthétique.
Le natif vérifie3resources, rejet ACK privé, pas de fichier créé et aucune once.
Les clients neufs relisent ACK/INTENT sans rejeu. Une première erreur du banc
concernait le retour JSON de client.request, corrigée avant qualification.
Pas de suite globale répétée hors périmètre inchangé. OpenSpec20/20avant puis
19/19après archive. Syntaxe72fichiers. Empreintes :qualification.json.

## 5. Accès web et effets externes

Pas de recherche documentaire supplémentaire pour ce correctif. La lecture
historique confirme APPROVED/CANCELLED, native et nativeResult absents, accès
RELEASED/RECONCILED ;elle ne produit aucun reçu rétroactif. Aucun effet Pixs
rejoué ni permission manipulée par le correcteur. Publication et activation
suivent l’archive et ont leurs preuves propres. Statistiques web exhaustives :N/A.
Aucun secret ou payload runtime réel versionné.

## 6. Bilan, impacts et limites

La cible shell refusée à l’exécution peut être rejetée après preuve d’identité.
INTENT avant POST, ACK204 après contrôle PID/version, réponse perdue non rejouée.
La garde once est inchangée. Le refus natif ne modifie pas automatiquement la
décision du mandat, la coordination ou l’accès ;la récupération reste propriétaire.
Aucune équivalence composite supposée par concaténation, aucun NO_EFFECT
historique inventé. Gains LLM/cache et vitesse de coupure de production :N/A.
