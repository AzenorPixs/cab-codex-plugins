# Qualification — CAB2.1.21

## Mécanisme exact

Le défaut2.1.20 reste reproduit avant activation de l’extension. L’examen de la source publique2.2.0 identifie une voie distincte du contrat HTTP : un plugin Promise exportant id/setup et session.hook. La découverte ConfigPluginSource observe les sources locales et recharge leur génération. Le module CAB sans dépendance enregistre context/generate/compaction ; il ne crée aucune permission ni exécution.

La projection ne déchiffre ni n’inspecte les valeurs : elle omet les parties reasoning et la propriété providerMetadata des seuls anciens messages assistant autorisés. Une connexion différente bloque avant appel fournisseur. La portée est fermée par PID, SID, fournisseur, modèle, connexion opaque et liste d’identifiants ; les autres sessions et les messages nouveaux restent inchangés. Les objets source et l’historique enregistré ne sont pas modifiés.

Sources officielles2.2.0 : packages/core/src/config/plugin/source.ts, packages/core/src/plugin/module.ts, packages/plugin/src/promise/session.ts, packages/core/src/session/model-request.ts et packages/core/src/session/runner/to-llm-message.ts dans https://github.com/anomalyco/opencode/tree/v2.2.0 .

## Banc natif privé

Binaire officiel2.2.0 exact déjà vérifié, fournisseur Responses synthétique loopback et deux clés fictives. Une ancienne commande shell /usr/bin/true est réellement terminée dans le workspace temporaire sous A ; la session est ensuite mise sous deny avant la transition B. Le refus des anciens blocs est reproduit sur le même modèle ; sonde neuve, resume:false et aller-retour de modèle restent distincts.

Le plugin CAB réellement distribué est copié dans un paquet natif, chargé à chaud après l’échec, puis le même modèle répond sous B dans le même SID/PID. Le checkpoint textuel, l’ancien call_id et son résultat fonctionnel sont transmis ; l’ancien outil et son enregistrement ne sont pas rejoués ou réécrits. L’enregistrement original portant le marqueur chiffré synthétique est identique après projection. Un second échange réussit, le pair non ciblé garde son refus, et un autre compte est bloqué avant toute nouvelle requête fournisseur. Aucun historique réel ni clé réelle lu, aucune compaction, alias ou nouvelle session métier.

## Tests et mises au point

Cinq tests unitaires vérifient projection sans mutation, conservation des contrats, portée étrangère, validation/duplication/limites, connexion/PID et nettoyage d’inscription partielle. Les mises au point du banc ont adapté l’enveloppe data de plugin.list et le champ modelID normalisé par le client. Le premier outil synthétique n’était pas produit sous deny : le banc produit désormais une unique commande inoffensive sous allow privé, puis impose deny avant toute transition. Le changement vers la même clé réutilise sa connexion native ; le test de connexion divergente emploie donc réellement l’autre clé synthétique. Aucune garde produit ou assertion de conservation n’est supprimée.

Les vérifications globales finales, syntaxe et OpenSpec sont consignées dans STATISTICS.md après leur réussite. Les sorties régénérables sont sous output/mode2-continuity et ne sont pas versionnées. AGENTS, DEVOPS, ORCHESTRATED_CODING et concurrent-runs restent aux empreintes du baseline ; aucun template n’est modifié. La preuve source n’est pas une continuité réelle : après publication et CABU, chaque propriétaire applique la règle et contrôle une nouvelle réponse historique sous deny avant le prévol CAB neuf et la reprise.
