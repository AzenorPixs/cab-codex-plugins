# Prévalider les payloads générés — CAB 2.2.39

## Séparer les couches avant tout stage

Un payload Bash peut contenir du Python, des here-documents ou une commande
distante. bash -n vérifie seulement la grammaire Bash ; une chaîne Python
cassée dans un here-document peut rester invisible à ce contrôle. Vérifier
les octets FINALS rendus, pas seulement le template qui les produit.

1. Identifier chaque couche et son interpréteur déjà retenu : générateur,
   enveloppe Bash, helper Python embarqué, script distant et rapport sérialisé.
   Conserver leur lien avec les octets scellés et leur empreinte.
2. Contrôler la syntaxe de l’enveloppe sans l’exécuter, puis extraire chaque
   helper par les délimiteurs exacts du format connu. Exiger une occurrence
   non ambiguë et une couverture de tous les helpers ; ne pas annoncer une
   couverture complète à partir d’une extraction partielle ou d’une regex
   générique. Les délimiteurs here-doc cités empêchent l’expansion shell.
3. Utiliser ast.parse ou compile(source, filename, 'exec') sans exec/import
   pour analyser le Python rendu avec l’interpréteur compatible retenu. Ne
   pas lancer le helper, charger un fichier env ou un secret, ouvrir SSH ou
   modifier l’environnement distant pour ce contrôle.
4. Vérifier aussi les constantes dont le sens change avec l’échappement,
   sans eval : un séparateur LF attendu vaut exactement un octet0a. Une
   syntaxe valide ne prouve pas que b"\\n" représente ce LF.
5. Corriger la couche génératrice minimale, rerendre et revalider toutes
   les couches affectées. Aucun remplacement global d’échappements ni retouche
   de l’ancien stage. Sceller ensuite les octets contrôlés sous des identités
   neuves après réconciliation de l’ancienne tentative.

## Exemple sans secret : un LF embarqué

Dans un template Python non raw, un échappement peut devenir un saut de ligne
réel à l’intérieur du littéral du helper et produire une SyntaxError. Deux
formes possibles, à choisir selon le générateur réellement utilisé :

- préserver les caractères antislash+n du source avec une couche raw maîtrisée ;
- exprimer le séparateur constant du helper par bytes([10]), pour éviter cette
  couche d’échappement. Cela ne dispense pas de vérifier le rendu complet.

Le helper final peut contenir `line = password + bytes([10])` : password reste
une variable locale, jamais une valeur injectée dans le modèle ou le stage.
Le contrôle syntaxique ne nécessite pas de définir ou lire cette variable.
Pour une constante connue, inspecter sa forme AST ; ne pas exécuter le helper
pour en découvrir la valeur. Une autre expression non qualifiée exige son
analyse propre, jamais un eval arbitraire.

## Produire un rapport JSON valide

Ne pas interpoler à la main une sortie ldd, un chemin ou un stderr dans un
littéral JSON. Tabulation, saut de ligne, guillemets et antislash doivent être
échappés par un sérialiseur. Conserver un consommateur JSON strict : corriger
le producteur, pas json.loads(strict=False), ni une suppression globale de tabs.

Exemple de sérialisation locale sur données synthétiques, sans effet distant :

```python
import json

record = {"dependency": "libexample.so.0\t=> /lib/libexample.so.0"}
line = "BUILD_OK " + json.dumps(record, ensure_ascii=False)
assert json.loads(line.removeprefix("BUILD_OK ")) == record
```

Un seul record structuré porte ce préfixe dans le protocole revu ; séparer les
logs du canal de résultat selon son contrat, refuser les records ambigus ou
absents, et conserver le code de sortie global. Tester la ligne finale exacte,
pas seulement un objet intermédiaire. Le round-trip doit couvrir tabs,
newlines, guillemets, antislash et Unicode utiles au format. Ne pas imprimer
de secret dans le record ou les logs pour résoudre un problème de parsing.

## Build effectué, rapport local échoué

Un exit non nul reste l’échec de la commande globale. Distinguer construction
d’artefact observée, sérialisation du rapport, transport SSH et recette produit.
Une erreur JSON après retour ne prouve pas que le build n’a pas eu lieu ; une
SyntaxError d’un helper ne prouve pas l’absence d’effets de son enveloppe déjà
exécutée. Ne pas transférer les preuves d’une tentative à une autre.

Réconcilier les effets réellement connus/inconnus avec les reçus exacts. Pour
un environnement de test persistant, le bail peut rester HELD entre commandes
selon [le contrat concurrent](concurrent-runs.md). Une clôture d’accès bornée
RECONCILED ne vaut ni NO_EFFECT ni libération du bail de test. Un effet distant
inconnu conserve ses protections jusqu’à preuve qualifiée.

Avant de réutiliser un artefact existant, l’observer sous le mandat et l’accès
appropriés : identité de l’environnement/workdir, correspondance des sources,
taille/empreinte, runtime/ABI et dépendances nécessaires. Une lecture fraîche
ne refait pas le build et n’exécute pas la recette. Si ces preuves concordent,
poursuivre la première étape non prouvée sur l’artefact conservé, avec nouveau
stage/validation/once lorsque requis. Ne pas reconstruire par défaut parce
que le lecteur du rapport a échoué.

## Reprise propriétaire

La correction d’un payload local dans le change déjà autorisé est une décision
de l’orchestrateur. L’agent de codage produit le correctif et les preuves ;
l’orchestrateur les examine, décide et orchestre les nouveaux mandats. Aucun
accord humain supplémentaire pour ce seul cadrage technique. Une extension
de ressource, une décision métier non déléguée ou un effet impossible à qualifier
reste traité selon le mandat, sans affaiblir une garde CAB.

Lire [la préparation locale](local-preparation-errors.md) pour les erreurs de
helper/lecture, et [le carrier](exact-shell-carrier.md) pour livrer les octets
contrôlés. Un défaut du produit CAB se distingue d’un payload de qualification
erroné. Toute correction documentaire/produit CAB suit SCM,version,commit,
publication puis CABU ; une nouvelle version n’exécute pas le build à la place
du propriétaire et ne répare pas rétroactivement un reçu exit20.
