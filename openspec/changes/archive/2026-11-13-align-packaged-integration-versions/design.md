# Conception

La version moteur est lue littéralement depuis src/cab_platform/__init__.py.
Le précontrôle compare pyproject.toml, frontend/package.json, les deux versions
racine du lock frontend, le bandeau Web, les manifestes et les commandes
CAB/CCAB/CABU. Les fichiers requis des skills restent obligatoires.
Le précontrôle est appelé avant création, suppression, copie ou archivage
de payload. La sortie et le manifeste runtime utilisent la version validée,
sans constante de version supplémentaire dans prepare.py.

Les erreurs conservent les payloads précédents. La finalisation installée
continue de vérifier elle-même l'égalité des manifestes et du moteur.
Le contrôle de préparation est testé avec des copies temporaires des seules
métadonnées ; aucune modification des configurations d'agents installées.
Le correctif utilise une nouvelle version publiée, jamais un remplacement
silencieux de l'asset3.2.0. Le paquet demi-configuré est réconcilié par APT
à partir de l'état et du reçu conservés, sans rollback ni réinitialisation.

## Orchestration système autonome

Une commande MCP cab_update admet un request_id stable et une version SemVer
optionnelle. Django persiste le job dans system_updates avec une seule case
active globale. Même demande : même reçu ; version divergente : conflit ;
concurrence : refus. Tout acteur CAB actif authentifié est admissible, sans
UID ni compte imposé. La lecture est limitée au demandeur ou administrateur.

Le service démarre la seule unité fixe cab-update.service, sans blocage. Cette
unité root est indépendante du groupe de cab.service et lance update-worker.
Elle télécharge uniquement depuis la release GitHub officielle, vérifie le
SHA256 et l’identité/version Debian, refuse un downgrade, installe par APT,
puis vérifie dpkg entièrement configuré, santé READY et finalisation exacte.
Le worker conserve étapes et résultat en base et reçu privé durable. Un effet
inconnu reste UNKNOWN et n’est pas réémis. La lecture MCP attend/reconnecte le
même job sans nouvelle mutation ; OK porte la version effectivement vérifiée.

Aucune nouvelle variable de configuration ni dépendance. Une première activation
de cette capacité depuis3.2.0 utilise le CABU root existant ; les invocations
suivantes utilisent le MCP. L’autorisation sans liste de comptes est explicite
pour cette opération bornée et ne confère aucun autre privilège root.

## Disponibilité et interface

L’accueil demande une vérification et lit immédiatement le cache de disponibilité.
Un worker distinct vérifie uniquement releases/latest sur le dépôt officiel,
avec délai borné, validation SemVer stable et cache en base. Un prochain contrôle
est choisi aléatoirement entre24h et48h après le précédent ; aucun client ne
relance GitHub dans les24h suivant une tentative. Après expiration, une visite
de l’accueil peut demander le contrôle avant l’échéance automatique aléatoire.
Les demandes simultanées sont coalescées.
Le bandeau affiche l’étiquette uniquement si la version connue est plus récente.
Le clic appelle l’admission du même job que le MCP ; son identifiant est conservé
pendant navigation/reconnexion et seul son état est relu ensuite. Aucune attente
GitHub, téléchargement ni installation ne bloque le rendu Web ou le superviseur.

La page administrative force un contrôle à chaque ouverture authentifiée ;
cette exception explicite ne change pas la limite des contrôles automatiques.
