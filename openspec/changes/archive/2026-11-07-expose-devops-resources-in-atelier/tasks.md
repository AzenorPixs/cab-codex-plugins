## Réalisation source
- [x] Inventaire et montages RO des ressources locales déclarées
- [x] Catalogue, empreinte, disponibilité et continuité des reçus
- [x] Contrat skill/plugin/commande et cadrages cohérents
## Qualification source
- [x] Tests vitaux : runtime externe/venv, régénération, identité, frontières/secrets/socket, reçu sans rejeu
- [x] Compilateurs Cython/Nuitka, outils locaux et navigateurs réels qualifiés
- [x] PostgreSQL authentifié en transaction READ ONLY ; Docker lecture seule ; preuve LXC PA01 réutilisée sans rejeu
- [x] OpenSpec, syntaxe, revue et préparation du rapport SGS avant archive
- [x] Version2.4.4 et préparation du cycle DIU/CABU, avec qualification distincte des opérations à venir

## Preuves opérationnelles séparées
La publication, CABU/versions actives et la confirmation de PA01/résolution
CCAB sont consignés dans output/scm-cab-244/activation. L’archivage source ne
les déclare pas réussis. Le TPM garde sa voie administrative ; aucune ouverture
de périphérique, socket ou réseau n’est accordée à l’atelier.
