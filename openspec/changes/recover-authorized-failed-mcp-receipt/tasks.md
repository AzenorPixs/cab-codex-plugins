## Implémentation et qualification

- [x] Autoriser `failed` uniquement via `--recover-mcp` sur le reçu exact non terminal.
- [x] Vérifier la snapshot inactive, les permissions, l’identité et l’intention durable avant POST.
- [x] Tester le succès, l’absence d’autorisation, les sessions/permissions actives, l’identité divergente et le non-rejeu.
- [x] Vérifier le rechargement unique du reçu exact ; constater le garde sur les artefacts historiques qui ne correspondent plus au source courant.
- [x] Ajouter la clôture `SUPERSEDED` strictement bornée aux trois modules broker identiques au paquet plus récent, en conservant l’historique et sans installation dans le même appel.
- [x] Qualifier les cas positif, artefact étranger divergent, version broker hors borne et absence de rechargement répété ; aligner CAB 2.1.44 et exécuter les suites/OpenSpec strict.

## Archivage et livraison

- [ ] Archiver le change et produire `STATISTICS.md` vérifié.
- [x] Mettre à jour la documentation CAB générique et la cartographie.
- [ ] Committer et publier sous SCM.
- [ ] Réconcilier le reçu exact, terminer CABU 2.1.44, puis vérifier les versions des fichiers et processus.
