# Diagnostics de notification et refus avant admission — CAB 2.1.12

## Why

Un refus correct resource-revision-stale avant admission devient une simple notification FAILED côté MCP. Le broker conserve le statut HTTP générique mais perd le code structuré ; le contexte du job traite localement le refus et ne nourrit pas le compteur HTTP du RUN. Cela impose un recoupement manuel des révisions sans remettre en cause les gardes de sécurité.

## What Changes

Conserver dans la notification un diagnostic borné (statut HTTP et code fermé reconnu, sinon inconnu), sans corps distant arbitraire. Compter les tentatives refusées corrélées au RUN connu, sans double comptage entre contexte et contrôleur. Documenter la différence entre échec de transport, refus avant admission et décision. Aligner2.1.12, qualifier, archiver/publier puis CABU coordonné et notification aux sessions de codage.

## Périmètre validé

Le développeur valide explicitement SCM avec incrément, puis CABU et communication aux sessions. Sources broker/copie distribuée, contrôleur/contexte/statistiques si nécessaire, tests, deltas OpenSpec, documents CAB, versions communes et cartographie ciblée. Aucun template/copie de protocole, métier Pixs, secret, registre ou transcript modifié. Un seul change. Les règles de révision, corrélation, admission, décision et once restent inchangées.
