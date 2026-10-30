# Statistiques — entrées modèle CAB2.1.18

## 1. Statistiques générales et décisions

SCM direct, un agent Codex, un correctif explicitement autorisé avec incrément de version. Un change, code non attribué selon la première partie ACL consultée sans allocation. Durée totale, tokens et coût : N/A, aucune collecte exhaustive. Aucune décision ou mesure fournisseur réelle provoquée pour qualifier ce correctif.

## 2. Types de messages et d’outils

Lectures ciblées, éditions, vérifications Node/Python/OpenSpec et inspection publique filtrée du runtime. Aucun agent délégué, pilotage ni compétence de télémétrie pilotée. Décompte exhaustif de messages/outils : N/A, non instrumenté. Les incidents reçus de pairs ne constituent pas des changements supplémentaires.

## 3. Fichiers modifiés

Client V2 et tests de contrat, contrôle documentaire de distribution adapté au protocole0.6 préexistant, référence model-policy et consignes skill/commande, versions communes, cadrages publics/CHANGELOG, deux spécifications et amendements ciblés Map/BATCH. Aucun template, protocole, credential ou état métier édité par ce correctif ; les contributions antérieures sont distinguées dans le commit complet SCM.

## 4. Commandes et vérifications

Client41/41, client+distribution73/73. Global final en deux groupes disjoints : concurrent130/130 et autres438/466avec28ignorés ; total unique596cas,568réussis,28ignorés,0échec dans les groupes finaux. Durées des groupes32,460s et54,222s, non additionnées comme durée murale. Deux passages monolithiques précédents ont échoué3puis1cas de fixtures ; trois premiers réussis isolément3/3, puis tous réussis dans les groupes finaux sans retrait d’assertion ni modification de borne. Python80/80,5,930s ; banc OpenCode natif privé2.2.2 :1/1,10,059s. Syntaxe59JavaScript/16Python, copies broker identiques, UTF-8/LF et quatre empreintes de cadrage/protocole inchangées. OpenSpec17/17 standard et strict avant archive ; deux exigences ADDED. Aucun passage monolithique annoncé comme réussi.

## 5. Accès web

Aucune recherche web ; transports de tests locaux et lecture publique filtrée du runtime. Les publications Git conditionnelles sont vérifiées séparément. Nombre exhaustif de requêtes : N/A, non instrumenté. Aucun credential exposé, schéma OpenAPI nouveau ni DELETE réel effectué.

## 6. Synthèse globale

Source2.1.18 qualifiée et archivée : model.variant refusé avant HTTP avec erreur explicite demandant model.reasoning ; niveau valide, lecture native et omission intentionnelle conservés. Pas d’alias, repli silencieux, changement de modèle actif ni rejeu. Publication et activation restent distinctes ; runtime2.1.17 observé, aucun CABU exécuté sous ce mandat source. Attribution de code de lot laissée à ACL ultérieur.
