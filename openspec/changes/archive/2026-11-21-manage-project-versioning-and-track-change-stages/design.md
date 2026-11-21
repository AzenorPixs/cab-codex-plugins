# Conception

## Configuration et conversion Git

Le scalaire `PROJECT_VERSION_POLICY` est écrit par CAB via l’édition contrôlée de
`project.env` et projeté dans PostgreSQL. Une première observation complète le
champ absent par la longueur de la version valide ou 3 si elle est absente.
Une version invalide et une politique explicite incohérente sont diagnostiquées.

L’ordre de livraison compare le nombre de composantes avant les valeurs
numériques. Une politique supérieure est donc toujours ordonnée après une
politique inférieure, quelles que soient les valeurs. Ainsi `0.3.8.0` est
supérieure à `4.0.0`, et à format égal, `3.10.0` est supérieure à `3.9.99`.
Une réduction confirmée dans Overview convertit les références locales selon
le format cible. La règle de livraison face à des tags distants d’une politique
supérieure après cette conversion reste à définir. Dans l’intervalle CAB
conserve son refus en présence d’un tag classé au-dessus du candidat.
Les gestionnaires de paquets ont leur propre ordre. Pour un futur passage
de CAB à quatre composantes avec ajout de zéros à gauche, le prévol CABU
peut considérer le nouveau paquet comme un retour de version selon `dpkg`.
La conversion locale n’autorise aucun contournement de ce contrôle.
L’évolution de la politique du projet CAB exige de qualifier séparément
le format et l’ordre des paquets et des métadonnées des plugins distribués.

### Parcours d’adaptation du dépôt Git local

1. **Inventaire.** CAB identifie le dépôt du projet et lit toutes ses
   références sous `refs/tags/`, y compris les références compactées.
   L’inventaire conserve pour chacune le nom complet et l’identifiant de
   l’objet de la référence. Pour un tag annoté, CAB conserve l’objet tag
   lui-même, avec son message, sa signature et son nom interne d’origine.
2. **Aperçu.** CAB classe les tags par format numérique, après lecture d’un
   éventuel préfixe historique `v` ou `V`. Il conserve ce préfixe lors de la
   conversion d’un tag historique. Les tags horodatés reconnus et les tags
   hors format restent dans l’inventaire pour détecter les collisions.
   Overview affiche la version cible, chaque renommage, les conflits et
   les tags conservés. Exemples avec ajout à gauche de 3 à 4 :
   `3.8.0` → `0.3.8.0` et `v4.0.0` → `v0.4.0.0`.
3. **Confirmation.** CAB associe l’aperçu au projet, au changement de
   politique, au côté choisi, à l’empreinte de `project.env` et à l’inventaire.
   Il revérifie ces éléments sous les verrous de projet et de Git. Une
   collision de nom ou de chemin de référence, un dépôt inaccessible ou
   un aperçu périmé bloque l’application. Un dépôt absent laisse possible
   l’adaptation du fichier et de sa projection.
4. **Application.** Un reçu durable enregistre l’état avant, les cibles
   prévues et les objets à préserver, avant toute mutation. CAB applique
   les créations et suppressions de références locales dans une même
   transaction Git avec vérification des valeurs d’origine. Il vérifie
   l’inventaire obtenu, écrit politique et version dans `project.env` par
   comparaison d’empreinte, puis rafraîchit PostgreSQL depuis le fichier.
   Les branches, le HEAD, l’index, les objets Git et les références distantes
   restent intacts.
5. **Réconciliation.** Sur interruption, CAB relit le même reçu et compare
   Git et le fichier aux états avant/après. Si Git correspond à la cible et
   que le fichier est encore dans son état initial exact, CAB peut terminer
   la mise à jour du fichier. Si le fichier a déjà la cible, CAB vérifie Git
   et resynchronise la projection. Une divergence empêche toute réécriture
   automatique et laisse le reçu à réconcilier.

## Accusé et cycle du RUN

Le nouveau cycle est identifié par sa version de schéma. Les RUN historiques
gardent leurs étapes et libellés. La sixième étape du nouveau cycle suit la
création ou le rattachement de la spécification, et précède une proposition
de version. L’accusé authentifié porte le RUN, la spécification, le rôle et la
révision du skill. Le codeur est le destinataire en direct et l’orchestrateur
en piloté. Le codeur choisit dans les deux modes. En piloté, l’orchestrateur
déclare ce choix auprès de CAB après avoir transmis le cadrage au codeur.

Le skill distribué indique de lire la spécification puis
`session_git_context`, qui donne la politique et le rôle chargé de la
lecture. Le destinataire utilise `version_skill_acknowledge` avec la révision
du skill et confirme avoir lu et compris le contenu. Le codeur motive la
position retenue dans `version_propose`. En piloté, l’orchestrateur
déclare le numéro proposé avec `session_delivery_select_version`.
L’agent reste dans le parcours de publication prévu par CICD ou CICDF.

## Mesure du travail par change

Une étape durable appartient directement au change et possède une clé stable,
distincte de son numéro d’affichage. Les enregistrements de `change_tasks`
restent la projection des tâches OpenSpec. Les itérations d’une étape
référencent cette étape et peuvent référencer le RUN comme provenance.
Les transitions et reçus CAB établissent les bornes, avec horloge serveur et
déduplication. Un retour en arrière ou un nouveau RUN ouvre une nouvelle
itération sans écraser les précédentes. La pause ou la fin observée clôt la
mesure en cours. Les intervalles sans borne fiable restent non mesurés.

Le cumul est une somme des durées mesurées par étape et par change. Deux
intervalles simultanés peuvent contribuer chacun au cumul de travail. CAB ne
réutilise pas une durée écoulée de session comme durée de travail du change.
CAB décrit les jalons mécaniques à partir de ses preuves. L’agent peut fournir
une description du périmètre, des travaux réalisés ou d’une reprise. Ce texte
n’établit aucun horodatage, aucune durée et aucune réussite.

La migration est additive pour le suivi temporel et ne reconstruit pas de
mesures historiques sans preuves. Le retrait du nouveau code après usage
exige de traiter les nouvelles données avant de rétablir la contrainte à 11.
