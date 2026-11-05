# Conception

## Découverte et contrôle

info utilise une requête globale scoped:false. sharedMcpDirectory découvre /api/location sans en-tête ni query de projet et reste lié au PID. La location est revérifiée à chaque contrôle ; une divergence pour le même PID est refusée. mcp/connectMcp/disconnectMcp ciblent seulement cette location. Un argument explicite égal reste compatible ; un autre argument échoue avant toute requête MCP au lieu d’être silencieusement ignoré. Les appelants internes omettent donc cet argument pour ne pas confondre workspace du service et location du broker.

## Session technique

createProbeSession({title,model}) exige le broker partagé connected, impose le répertoire partagé et une unique permission native * / * / deny. Il refuse toute clé permettant de changer permissions, agent ou répertoire. Le POST createSession transmet aussi directory explicitement par query/en-tête, en plus de la location dans le corps. Le helper renvoie la session et son directory ; prompt, lecture et suppression ciblent ensuite ce directory explicite. La session de codage est préservée, aucun outil ou code ne doit être demandé par la sonde.

## Récupération explicite

Aucune boucle de maintenance ou sonde n’effectue de réparation. Si un contexte étranger détient déjà le broker, l’opérateur établit son identité, l’absence de sessions actives/permissions/effets inconnus à une frontière sûre, puis utilise les routes natives ciblées existantes via request : disconnect du seul contexte concurrent identifié, connect du workspace partagé. Vérifier ensuite concurrent disabled, partagé connected, même PID et readiness fraîche. Ne pas supposer GET MCP sans effet d’initialisation, ne pas inspecter arbitrairement tous les répertoires. Pas de suppression de verrou ni instance/dispose ni redémarrage OpenCode. Une réponse inconnue interdit l’annonce de succès.

## Unités et validation

1. Deltas spécifiés et validés avant code.
2. Client + adaptations des appelants + tests positifs/négatifs : lot indissociable car le refus d’argument divergent doit rester compatible avec les services de workspace distinct.
3. Banc réel privé : sonde créée depuis client de workspace technique mais hébergée au workspace partagé, outils interdits, MCP et PID conservés, suppression ciblée.
4. Documentation, généralisation et version commune, puis suites globales, archive/statistiques/publications.
5. CABU et notifications après activation prouvée. Aucune mesure locale ou fichier source ne prouve à lui seul l’activation.
