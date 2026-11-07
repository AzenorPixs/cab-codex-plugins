# Qualification du correctif2.4.1

Code non attribué. Mandat permanent du développeur : correctifs CAB sousSCM, incrément, commit/publicationCI-CD puisCABU. Les incidents C12 et PA01 sont réservés dans CCAB ; leurs résolutions restent individuelles.

## Sources et tests

- Reçu propriétaire : lecture/écriture bornées128Mio, propriétaire, liens, scope et signature conservés. Reprise du même plan, sans nouvelle transaction.
- Le dernier marqueur d’époque du plan signé prouve l’application ordonnée et persistée. Avec absence actuelle vérifiée, les progrès ultérieurs des pairs ne sont pas réécrits. Un marqueur divergent ou une référence réintroduite conserve le refus.
- Recherche littérale exhaustive en un passage, motifs imbriqués et Unicode ; compatibilité de l’argument RegExp existant.
- Reprise2.4.1 sur runtime2.4.0 explicite, seulement execute/finalize/verify et transaction v1 existante ; versions et PID sont contrôlés exactement. Une version inconnue est refusée avant coupure.
-77tests ciblés réussis sans skip :54unitaires,15intégrations,3propriétaire dont deuxUID réels avec le broker publié2.4.0,5gros reçu/marqueur/références. Preuve : output/scm-cab-241/vital-final.tap.
-84fichiers syntaxiquement vérifiés, dont17Python compilés avec cache isolé. Preuve : output/scm-cab-241/syntax.json.
- OpenSpec strict du change réussi ; la validation canonique suit l’archivage.

## Qualification réelle sans mutation

C12 : même transaction erasure-8bf1e6c3-15cc-48ae-8c2a-a501f4bec290, propriétaire APPLYING, plan signé76 220 865octets,1115identifiants. Les quatre cibles avaient toutes leurs empreintes après, puis les pairs ont légitimement progressé ; le marqueur signé demeure exact. La vérification fraîche avec le correctif trouve0entrée et0référence dans les deux fichiers du journal, en2427ms, contre57709ms avec l’ancien scanner. Aucun fichier métier ni clé n’a été modifié par cette qualification. APPLIED/PURGED restent à constater dans les reçus opérationnels.

PA01 : la forme précédente à apostrophes dans argv n’était pas corrélée ; le rendu JSON littéral conservant le même essai a ensuite permis une écriture/lecture de fichier avec Node. La limite Python/Cython non exposé est une entrée CCAB distincte, hors de ce premier lot. Son accès helper a été libéré après preuve SYNTAX_OK, sans rejeu. La barrière de transport correspondait au cleanup C12 postérieur au CABU déjà adopté.

## Livraisons distinctes

Les helpers corrigés restent compatibles avec les processus2.4.0 du nettoyage en cours. Pendant sa reprise, les points d’entrée Python/contrat du broker sont conservés depuis le paquet2.4.0 publié et vérifié ; aucun état métier ancien n’est restauré. Le client2.4.1 explicite `--runtime-version 2.4.0` distingue helper et processus. Le CABU global2.4.1 suit la fin de cette phase critique et ne se déduit jamais d’un helper à jour.

Le rapport SGS provient du service permanent et de la vraie session Codex, sans codeur OpenCode ni orchestrateur fictif. La borne de mesure précède publication et activation ; les reçus opérationnels portent ces étapes. L’isolation globale du processus OpenCode n’est pas une propriété de ce correctif.
