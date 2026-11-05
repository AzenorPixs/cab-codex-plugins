## Décision

Conserver le schéma 4 et la décision dans le ledger. CANCELLED + empreinte
native, sans native ni accès, clôt la validation sans remplacer approved par
rejected. La communication privée retire demande et réponse exécutable ; son
restaurateur ignore ce terminal au prochain démarrage. Une interruption entre
les deux écritures converge depuis le ledger à la reprise. Les deux lectures
stables, identité exacte, session idle et absence de permission restent exigées.
Le chemin cachedPrepared passe après la détection d’annulation ; les autres
restaurations de permissions déjà en mémoire conservent leur raccourci.
Les événements idle/fin réutilisent le garde de réconciliation par RUN.

## Vérifications

Régression avant/après, avec et sans redémarrage ; rejet des preuves divergentes,
native consommée et accès lié. Suite globale, Python et campagne OpenCode native.
Versions et empreintes alignées ; publication puis activation par CABU.
