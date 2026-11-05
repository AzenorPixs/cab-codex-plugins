# Conception

La politique cab-source conserve la destination fermée workspace/src et ses contrôles. managed-release ne s’applique jamais au broker dans cette politique ; il continue à protéger les liens des scripts et du Web.

Le prévol vérifie le credential privé utilisateur avant toute coupure. Une option --opencode-password-env-file explicite n’accepte que project.env du workspace source ou des services. Le processus local ignore toutes les autres clés, ne fait aucune interprétation shell et refuse doublons, échappements/interpolations ou valeur vide. La valeur n’est jamais transmise au modèle, aux arguments, à l’environnement, au journal ou aux empreintes. Un credential existant différent reste intact et provoque un refus. Un credential nouvellement provisionné reste privé et conservé après un échec : il ne fait pas partie des sauvegardes d’artefacts restaurables.

Les erreurs de service enregistrent uniquement nom du composant, ActiveState, SubState, Result et ExecMainStatus filtrés. Aucune sortie brute de systemctl ou du journal n’est persistée. Une erreur de vérification est conservée avant repli.

Le raccord d’authentification est testé avec valeurs synthétiques, puis par lecture /api/info et /api/location de l’instance réelle, sans lecture de sessions, commande métier ou reconnexion du broker. Les tests n’installent pas le patch dans le profil réel.

La revue de distribution a relevé des écarts préexistants entre le protocole local (1.10.4, alias /cab et STATISTICS.md) et sa référence embarquée (1.10.6, /CAB et STATISTIQUES.md). La référence est réalignée sur le protocole conservé ; le test du nom de rapport suit AGENTS.md et SCM. Aucun changement sémantique de coordination ni correction du référentiel template n’est réalisé.

Les règles actuelles AGENTS.md et SCM imposent STATISTICS.md. Les références de distribution et les deux exigences canoniques portant encore l’ancien nom français sont alignées par deltas MODIFIED complets ; aucun autre contrat statistique n’est changé. Les archives historiques restent intactes.
