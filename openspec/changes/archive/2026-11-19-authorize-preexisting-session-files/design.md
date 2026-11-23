# Conception

## Autorité de l'invocation

Une invocation explicite CCAB constitue le mandat développeur de correction
de CAB sous SCM avec CICD. Elle couvre les spécifications, le code, les tests,
les documentations, les intégrations distribuées et leur livraison/activation
nécessaires. Aucun accord générique supplémentaire n'est demandé par incident,
fichier ou étape dans ce périmètre. Les permissions techniques et restrictions
explicites restent applicables ; les projets consommateurs gardent leur mandat.
Une déclaration d'incident seule ne modifie pas une autorisation de fichier
dans un projet consommateur.

## Admission d'un préexistant

Les commandes administratives session.git.inspect_preexisting et
session.git.authorize_preexisting portent sur des chemins littéraux du RUN.
L'inspection ne restitue aucun contenu : identité du RUN, cadrage, révision,
baseline, HEAD, index éventuel, statuts Git et empreintes entières des fichiers.
L'autorisation exige cet état exact, un request_id stable et la référence
de l'autorisation développeur. Elle crée un événement immuable ; elle ne
réécrit ni baseline, ni fichier, ni index et ne lance aucune commande métier.

Les verrous Git existants et une transaction sérialisent inspection/admission
et réservations. Gel, import, revue, clôture, suspension, effets indécis,
baux, fichier réservé, lien, fichier ignoré, renommage, conflit ou modification
déjà présente dans l'index partagé sont refusés. Les lectures sont bornées.
Le retour identique retrouve son reçu ; une entrée différente du même
request_id est refusée. La réservation native vérifie de nouveau les seules
empreintes du chemin et son contexte, puis journalise l'autorisation utilisée.
Une modification étrangère après l'admission invalide cette prise en charge.
Il ne s'agit pas d'une adoption legacy et aucun privilège de celle-ci n'est créé.

## Ancien dirty désormais propre

La baseline reste historique et inchangée. Lorsque le statut courant ne contient
plus le chemin, CAB compare les octets et le mode du fichier au blob du HEAD
observé. Une concordance permet la réservation ordinaire et laisse une trace ;
un statut clean masquant des octets différents ne suffit pas.

## Livraison et preuves

Les neuf fichiers du tableau CCAB futur restent en quarantaine coordonnée :
ils ne doivent pas entrer dans le paquet 3.2.22. Les tâches d'implémentation
ci-dessous ne valent ni livraison, ni installation, ni résolution d'incident.
Ces exigences restent suivies par les reçus du RUN, de CABU et de CCAB.
