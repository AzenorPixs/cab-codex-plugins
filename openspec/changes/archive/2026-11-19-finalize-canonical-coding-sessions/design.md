# Conception

Le namespace statistics/runs/<SHA256(projet,RUN,SID,génération)> conserve un vrai rapport statistique et non une structure OpenSpec artificielle. Le RUN doit être une livraison cadrée sur au moins un fichier openspec/specs/<capacité>/spec.md présent, sans dossier actif/archive ni ChangeSource historique disparu. La sélection de preuves reste celle du dossier de finalisation.

Run.configuration.canonical_statistics conserve la projection (identité complète, chemin, contenu, SHA, empreinte du bloc CAB, état), sous verrou et avec événements de révision. Le fichier local reste maître. Les périodes sont filtrées sur le RUN : aucune mesure d’une autre session du même change. Les reçus de tests sélectionnés fournissent les compteurs observés ; les périodes absentes/incomplètes restent N/A.

statistics_service réutilise guarded/write/stage_document pour la publication atomique et l’indexation immédiate. Une cible canonique doit être exactement celle du RUN enregistré et sans réservation étrangère. Le global concatène les maîtres locaux canoniques et les changes, sans somme ni projection double d’un même RUN. L’identifiant de synchronisation distingue la production canonique de l’ancienne synchronisation sans rapport ; un effet UNKNOWN n’est jamais réémis.

closure_git conserve ses index, empreintes, verrous, contrôles des destinations et états inconnus. Il admet le seul chemin canonique dérivé du RUN ; aucun chemin fourni arbitrairement n’est admis. Une reprise de commit terminal inconnu reste protégée, sans nouvelle livraison.

view conserve les manques courants du dossier et les attentes de la phase FINALIZING (rapport, publication, commit terminal). READY ne masque plus ces attentes. Une nouvelle progression réussie est seule autorisée à retirer un blocage persistant.

Les anciens rapports et les blocs manuels sont conservés. Aucun SQL direct, changement d’identité, pseudo-test, faux tasks.md ou remise à zéro d’un reçu n’est utilisé pour débloquer Template.

## Qualification et revue

Le 19 novembre 2026 : 17 tests ciblés PG avec annulation transactionnelle et dépôt Git temporaire réussis ; 20 régressions terminales, formats et contrat réussies. La publication/indexation du rapport et du global est réellement exécutée dans le dépôt de fixture ; le transport terminal est simulé dans le test de cycle et n’est pas une preuve d’envoi du RUN Template. Revue CCAB acceptée avant livraison. Le runtime public utilisé pour la première qualification a été rétabli aux octets du paquet23 livré, sans APT, redémarrage ou rechargement ; la qualification finale utilise les sources réservées. L’activation et la vérification du déclarant restent distinctes.
