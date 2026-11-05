# Conception

`nativeCodingMandate` ajoute une instruction bornée pour les seules méthodes
MCP CAB : obtenir le nom par une discovery complète puis utiliser
`tools["cgpt-validation"].<method>(...)` dans le wrapper Code Mode `execute`.
Les opérations natives write/edit/shell gardent leur voie distincte. Si
`execute` ou une méthode découverte manque, le helper demande de s'arrêter et
de signaler le blocage. La référence distribuée explique cette distinction.
