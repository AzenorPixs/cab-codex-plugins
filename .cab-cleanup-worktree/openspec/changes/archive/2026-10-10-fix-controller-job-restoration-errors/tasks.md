## 1. Spécification

- [x] 1.1 Définir les exigences de restauration et de diagnostic sans contenu sensible.
- [x] 1.2 Valider strictement le change avant toute écriture de code ou de test.

## 2. Correctif et preuves

- [x] 2.1 Ajouter les tests isolés d'absence, de restauration et de refus explicite.
- [x] 2.2 Distinguer ENOENT des erreurs de lecture et de décodage dans le contrôleur.
- [x] 2.3 Vérifier les tests ciblés et les non-régressions de récupération.
- [x] 2.4 Mettre à jour TECHNICAL.md, README.md et CHANGELOG.md.

## 3. Version et validation finale

- [x] 3.1 Aligner les composants, la distribution, les tests et le delta de version sur 0.87.0.
- [x] 3.2 Vérifier syntaxe, versions, UTF-8/LF et périmètre natif sans inspection Git.
- [x] 3.3 Valider le change et les références, avec les seules réserves strictes historiques.
- [x] 3.4 Extraire le protocole vers ORCHESTRATED_CODING.md et vérifier les huit renvois AGENTS.md autorisés.

## 4. Clôture après validation

Après preuve des tâches ci-dessus, archiver uniquement ce change éligible et
vérifier la synchronisation. Produire ensuite STATISTIQUES.md dans l'archive
réelle, sans compétence SCMP. Les preuves d'archivage et de rapport sont
consignées seulement après leur exécution effective.

## Preuves intermédiaires

- Delta strict valide avant toute écriture de code ou de test.
- Avant correctif : 2 tests ciblés réussis et 2 échecs reproduisant les erreurs masquées.
- Après correctif : 4 tests ciblés réussis.
- Récupération : première exécution 6/7 avec `fetch failed`, puis 7/7 à commande identique sans modification des tests ; cause exacte du premier échec non déterminée.
- Suite Node complète : 36/39 ; trois échecs de distribution portent sur des paragraphes manquants dans AGENTS.md, inchangé depuis le début de SCM.
- Suite Python : 38/38 réussis après alignement des attentes de version sur 0.87.0.
- Syntaxe : contrôleur, superviseur, deux fichiers de tests JavaScript et trois fichiers Python modifiés valides ; cache de compilation propre à SCM nettoyé.
- Après la demande documentaire complémentaire : suite Node complète 40/40, puis suite de distribution 13/13 après la précision du caractère facultatif ; aucune attente fonctionnelle préexistante affaiblie.
- Huit AGENTS.md et huit ORCHESTRATED_CODING.md vérifiés en UTF-8/LF ; identité locale et règles générales conservées, absence normale explicitée pour les projets sans besoin de pilotage.
- Références avant archive : 7/7 valides en mode standard ; strict global en échec sur les treize avertissements historiques, zéro ERROR. Le delta ciblé reste strictement valide.
- PROJECT.md a reçu un diagramme concurrent : ajout identifié par empreinte inverse, conservé sans modification par SCM.
