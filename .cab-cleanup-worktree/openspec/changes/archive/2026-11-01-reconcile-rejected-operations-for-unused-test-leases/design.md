# Design

Le contrôleur garde l’algorithme de libération existant et enrichit seulement
la preuve native qu’il accepte. L’opération de validation rejetée est reconnue
depuis une décision native corrélée encore disponible ou le reçu
`REJECTION_ONLY` déjà persisté par CAB. Le reçu doit référencer exactement la
même opération ; aucun accès ni permission native ne doit exister. Son état
reste `PREPARED` sans `native`.

Les wrappers Code Mode ne sont pas classés depuis leur seul nom. Chaque appel
interne provient de métadonnées natives complètes et non tronquées, a un état
terminal et appartient à la liste fermée d’outils CAB sans effet sur
l’environnement. Un wrapper sans appel interne n’ajoute aucun effet natif.
Toute commande, méthode inconnue ou permission native reste bloquante.

La preview renvoie un état filtré même lorsque la vérification refuse la
restitution : code de blocage, état d’approbation générale, classification
bornée des opérations et compteurs natifs. Elle ne renvoie aucun argument,
sortie, jeton, code exécuté ou message libre. La route POST refait toutes les
vérifications à partir de l’état courant ; une preview antérieure n’autorise
aucune libération.
