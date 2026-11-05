# Statistiques globales

**NCA — Nombre de changes analysés : 177**

## 1. Périmètre et durée

| Indicateur | Nombre de changes | Valeur (jours décimaux ; NCMA en changes achevés/jour) |
| --- | --- | --- |
| DGCT — Temps total de développement du projet via l’IA | 8 | 0,517512 |
| DGCTSPA — Temps total de développement du projet via l’IA hors pauses et attentes | 0 | N/A |
| NJT — Écart entre le début du premier change et la fin après archivage du dernier | 177 | 33,374826 |
| NCMA — Changes achevés par jour (NCA / NJT) | 177 | 5,303398 |

| Indicateur | Nombre de changes | Valeur en heures décimales |
| --- | --- | --- |
| DGCTM — Durée moyenne pour 8 changes | 8 | 1,552535 |
| DGCTSPAM — Durée moyenne pour 0 changes hors pauses et attentes | 0 | N/A |

## 2. Agents intervenants et LLM

À date, les agents de codage et orchestrateurs ont utilisé les dernières versions disponibles au moment de chaque change.

### LLM des agents de codage

| Nombre de changes réalisés ou partiellement réalisés | Modèle de LLM | Niveau de raisonnement | Pourcentage de NCA |
| --- | --- | --- | --- |
| 167 | N/A | N/A | 94,35 % |
| 1 | gpt-6 | N/A | 0,56 % |
| 1 | gpt-6.1-sol | N/A | 0,56 % |
| 1 | gpt-6.1-sol. | N/A | 0,56 % |

### LLM des agents orchestrateurs

| Nombre de changes réalisés ou partiellement réalisés | Modèle de LLM | Niveau de raisonnement | Pourcentage de NCA |
| --- | --- | --- | --- |
| 5 | GPT-6.1 | high | 2,82 % |

## 3. Performances des LLM de codage OpenCode

Aucune ligne de performance complète disponible.

| Indicateur | Valeur |
| --- | --- |
| TMTM total moyen (s) | N/A |
| Débit minimal total moyen (tokens/s) | N/A |
| Débit moyen total moyen (tokens/s) | N/A |
| Débit maximal total moyen (tokens/s) | N/A |

## 4. Consommation de tokens, coûts et compactions des codeurs

| Mesure | Total | Moyenne par change |
| --- | --- | --- |
| Tokens d’entrée | N/A | N/A |
| Tokens de sortie | N/A | N/A |
| Tokens de raisonnement | N/A | N/A |
| Tokens de cache lus | N/A | N/A |
| Tokens de cache écrits | N/A | N/A |
| Total natif des tokens | N/A | N/A |
| Compactions achevées | N/A | N/A |

| Devise du coût de production déclaré | Total | Moyenne par change |
| --- | --- | --- |
| N/A | N/A | N/A |

## 6. Messages et outils des codeurs

| Mesure | Total | Moyenne par change |
| --- | --- | --- |
| Messages des codeurs | N/A | N/A |
| Appels d’outils des codeurs | N/A | N/A |

| Résultat technique des appels | Nombre | Pourcentage |
| --- | --- | --- |
| Appels terminés | N/A | N/A |
| Erreurs techniques | N/A | N/A |
| Appels en cours | N/A | N/A |

Les messages utilisateur peuvent provenir de l’orchestrateur et ne représentent pas nécessairement des messages humains.

| Rôle des messages | Nombre | Pourcentage |
| --- | --- | --- |
| assistant | N/A | N/A |
| utilisateur | N/A | N/A |

| Outil | Nombre | Pourcentage |
| --- | --- | --- |
| N/A | N/A | N/A |

## 7. Autorisations des opérations des codeurs

| Mesure | Total | Moyenne par change |
| --- | --- | --- |
| Demandes d’autorisation distinctes | N/A | N/A |

| Statut | Nombre | Pourcentage |
| --- | --- | --- |
| Demandes approuvées | N/A | N/A |
| Demandes refusées | N/A | N/A |
| Demandes expirées | N/A | N/A |
| Demandes annulées | N/A | N/A |

## 8. Fichiers et volume du code actuel

| Mesure | Total | Moyenne par change |
| --- | --- | --- |
| Écritures effectivement exécutées | 24 | 24,000 |
| Fichiers distincts touchés par change | N/A | N/A |

Le volume mesure le stock actuel de sources propres au produit, chaque fichier physique une seule fois. Les lignes mixtes contribuent aux deux compteurs ; les docstrings de documentation sont classées en commentaires.

| Périmètre | Lignes de code | Lignes de commentaires |
| --- | --- | --- |
| Global | 32787 | 487 |
| Broker | 10804 | 351 |
| Interface du moniteur | 699 | 1 |
| Outils CAB | 21284 | 135 |

## 9. Commandes des codeurs

| Mesure | Total | Moyenne par change |
| --- | --- | --- |
| Commandes exécutées | 315 | 105,000 |

| Résultat | Nombre | Pourcentage |
| --- | --- | --- |
| Commandes réussies | 237 | 92,58 % |
| Commandes en échec | 19 | 7,42 % |

| Famille de commandes | Nombre | Pourcentage |
| --- | --- | --- |
| Autres | 35 | 59,32 % |
| OpenSpec | 7 | 11,86 % |
| Tests | 17 | 28,81 % |

## 10. Accès web des codeurs

| Mesure | Total | Moyenne par change |
| --- | --- | --- |
| Appels aux outils web | 0 | 0,000 |

| Mesure | Nombre | Pourcentage |
| --- | --- | --- |
| Appels web réussis | 0 | N/A |
| Recherches web | 0 | N/A |
| Consultations web | 0 | N/A |

Détail des appels web : N/A.

## 11. Validation et livraison des codeurs

| Mesure | Total | Moyenne par change |
| --- | --- | --- |
| Tests exécutés dans le bilan final | 91742 | 556,012 |
| Fichiers ayant passé un contrôle syntaxique | 676 | 67,600 |
| Tâches OpenSpec prouvées et terminées | 101 | 7,214 |

| Résultat des tests finaux | Nombre | Pourcentage |
| --- | --- | --- |
| Tests finaux réussis | 91733 | 99,99 % |
| Tests finaux échoués | 9 | 0,010 % |

| Catégorie de tests | Nombre |
| --- | --- |
| N/A | N/A |

| Validations OpenSpec | Nombre | Pourcentage |
| --- | --- | --- |
| standard — réussies | N/A | N/A |
| standard — échouées | N/A | N/A |
| strict — réussies | 56 | 100,00 % |
| strict — échouées | 0 | 0,00 % |

N/A : mesure absente, partielle, contradictoire ou sans périmètre comparable établi. Les cumuls historiques ne constituent pas une validation actuelle du projet.

## 12. Synthèse transversale des codeurs

| Domaine | Nombre d’appels | Pourcentage des appels |
| --- | --- | --- |
| Écritures de fichiers | N/A | N/A |
| Commandes | N/A | N/A |
| Web | N/A | N/A |
| Autres outils | N/A | N/A |
| Total | N/A | N/A |
