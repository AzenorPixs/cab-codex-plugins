# Conception

Un profil de reprise précisément versionné accepte le helper 2.4.37 avec contrôleur, superviseur et moniteur 2.4.35, pour un reçu propriétaire de lot déjà figé et préparé. Le broker 2.4.35 conserve son PID jusqu'au commit ; son worker corrigé est exécuté sous son propriétaire. Après la coupure du reçu, le broker issu du paquet 2.4.37 peut être reconnecté temporairement au runtime 2.4.35 exclusivement pour achever et vérifier ce même reçu, puis CABU aligne toutes les briques. Les identités, versions, portée et preuves natives sont contrôlées ; aucune autre combinaison ou nouvelle transaction n'est admise. Une erreur conserve le reçu et ne constitue pas une réussite.

Si le broker préparé a disparu et que l’application reste incertaine, le prévol doit vérifier sa
mort, l'identité OpenCode et des services, les bindings/gates/permissions du
reçu et les preuves disponibles sans supposer l’absence d’effet. La reconnexion MCP ciblée peut
transmettre automatiquement le commit propriétaire : elle constitue un effet
distinct à autoriser avant exécution. Le nouveau broker doit attester le même
UID propriétaire et le même scope signé ; son PID/instance et le reçu APPLIED
sont conservés avant toute coupure. Toute divergence interrompt la reprise.
