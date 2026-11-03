# Conception

La méthode `messages` doit valider son argument de location comme chemin absolu
et le transmettre à chaque GET paginé par l’option `locationDirectory` du
client HTTP natif. La taille des pages, les curseurs, l’ordre, les plafonds et
les validations de réponse restent inchangés.

Le test configure une location par défaut différente et vérifie que les
requêtes de toutes les pages portent la location explicite de session. Aucune
écriture ni récupération de session réelle n’est nécessaire pour cette
qualification.

