# Statistiques — Clarification de l’authentification CAB

## 1. Statistiques générales et décisions

SCM documentaire demandée par le développeur, base2.2.11 inchangée,
révision +codex des deux plugins incrémentée.

| Mesure | Valeur |
|---|---|
| Tests finaux uniques | 37réussis,0échec,0ignoré |
| Tâches terminées | 3 |
| Durée globale, modèle et raisonnement | N/A — export exhaustif absent |
| Tokens/cache LLM et coût | N/A — mesure de production absente |

Un succès ne prouve pas une approbation humaine. Erreurs et refus restent
distincts. Pourcentages messages/outils :N/A, dénominateurs absents.

## 2. Types de messages et d’outils

Lectures ciblées, édition de références, métadonnées et OpenSpec, tests de
distribution, Git SCM/publication/CABU. Aucun agent délégué ni effet Pixs.
Compteurs exhaustifs :N/A.

## 3. Fichiers modifiés

Interfaces, triage et préparation, deux manifestes plugins, index/cadrage,
OpenSpec et qualification. Aucun fichier runtime, commande canonique ou
credential modifié. Inventaire exact :commit SCM.

## 4. Commandes et validations

| Vérification finale | Réussites | Échecs | Ignorés |
|---|---:|---:|---:|
| Node distribution et contrat | 37 | 0 | 0 |
| Total unique | 37 | 0 | 0 |

Tests141ms. OpenSpec20/20avant puis19/19après. Pas de nouveau test Python,
natif ou syntaxe de code :aucun code modifié. Métadonnées JSON parsées,
liens et distributions vérifiés ;UTF-8/LF contrôlés au commit.

## 5. Accès web et effets externes

Deux GET directs sans authentification :401. Le client CAB authentifié retourne
200 pour info, MCP et le SID existant ;C12 confirme indépendamment info/session
avec le même helper, sans argument credential. Aucun POST métier ni nouveau SID,
aucune valeur de secret affichée. Publication/CABU ont leurs preuves séparées.
Nombre exhaustif des appels/messages :N/A.

## 6. Bilan, impacts et limites

Le401 non authentifié ne démontre pas un SID inutilisable. Le client local
consomme le credential privé sans le communiquer au modèle. Une capacité
locale réellement manquante ou un échec authentifié restent à diagnostiquer.
La révision documentaire ne modifie ni l’authentification ni la garde native.
Le parcours de handoff est distinct. Aucun gain LLM/cache ou temps de coupure
n’est déduit des tests ;la préparation attend un CABU conforme sans redémarrage.
