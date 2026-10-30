# Arguments natifs exacts avant once — CAB2.1.22

## Portée et empreinte

Pour chaque nouveau mandat natif write/edit, préparer les arguments EXACTS de l’outil (path/content ou path/oldString/newString/replaceAll selon son contrat). Calculer tool_input_sha256 avec nativeToolInputDigest exporté par cgpt-approval-bridge-opencode-client.mjs. C’est le SHA256 du JSON UTF-8 à clés d’objets triées récursivement ; ordre des tableaux et chaînes conservés, aucune normalisation Unicode ou de fin de ligne. Une empreinte du fichier seul ou inscrite dans summary ne remplace pas ce champ.

Transmettre tool_input_sha256 au request_validation du fichier unique et vérifier sa concordance avec les arguments revus AVANT décision APPROVED. Le broker conserve le champ et refuse sa substitution ou suppression sur une même identité ; la décision corrélée reprend la même empreinte. La neutralité de CAB et l’examen par l’orchestrateur restent indispensables : le modèle ne s’autorise pas en fournissant une empreinte de son choix.

## Garde avant effet

Le client V2 rapproche permission, SID, message et call natifs, vérifie leur cible puis calcule nativeToolInputSha256 depuis la partie source. Une métadonnée libre nativeSourceVerified/nativeToolInputSha256 est supprimée et ne fournit aucune preuve. Cette dérivation couvre les cibles absolues et relatives des appels natifs write/edit documentés ; une source absente ou ambiguë reste non prouvée.

Après acquisition de l’accès et juste avant transmission de once, le contrôleur exige la preuve native et l’empreinte exacte du mandat protégé. Une divergence invalide son exécution, expose blockedNativeInputs avec requestId/error=native-tool-input-digest-mismatch et ne consomme aucune permission. L’APPROVED initial reste la décision sur les arguments revus ; CAB ne la transforme pas en une décision nouvelle et ne transmet pas une approbation à une entrée différente.

Le propriétaire conserve le checkpoint/accès pendant la réconciliation, vérifie le refus avant effet puis rejette explicitement la permission native divergente. Nouvelle proposition exacte, nouvelles identités et nouvelle once seulement ensuite ; aucun retry aveugle ou ancienne once rejouée. Une divergence d’arguments ne prouve pas une panne du modèle et ne déclenche aucune PLLM.

## Limites conservées

Les mandats historiques sans tool_input_sha256 restent compatibles et ne sont pas protégés par cette extension. Le protocole courant impose le champ aux nouveaux write/edit et l’orchestrateur refuse une proposition qui l’omet ; l’activation ne réécrit ni anciens contrats ni décisions en cours.

Cette garde ne remplace pas le contrôle du fichier après effet : un formatter natif, un changement de révision ou une mutation via shell possède ses propres contrôles. Elle n’étend pas l’autorisation aux commandes, aux outils inconnus ou à plusieurs fichiers. Le digest lie les arguments natifs, pas une équivalence AST, une intention ou un résultat reconstruit.

## Qualification et adoption

Banc exact2.2.0 : broker réel, contrôleur, write et edit exacts avec une once corrélée ; même chemin mais contenu divergent après APPROVED, accès acquis, aucune once et fichier inchangé, puis rejet natif explicite. Tests de métadonnées fabriquées, Unicode/CRLF, tri des clés, retry changé/supprimé et persistance. Les gardes existantes de cible, ask, accès, révisions et fin native restent actives.

Après SCM/publication/CABU vérifiés, chaque propriétaire adopte le champ sur ses prochains mandats en préservant RUN/job/SID, choix PLLM et travaux acquis. Aucun redémarrage d’OpenCode ni installation parallèle du plugin de contexte n’est requis pour ce contrôle de permission.
