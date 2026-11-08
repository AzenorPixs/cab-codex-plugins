# Conception

Le propriétaire calcule sous ses verrous un périmètre de rétention uniquement additif. Il ne peut ajouter à la rétention un identifiant faisant partie des identifiants initiaux ciblés. Il contrôle l’absence sur ce périmètre avant d’enregistrer la portée effective ; aucune suppression n’est rejouée. Le contrôleur fusionne uniquement les identifiants retenus attestés par le reçu du propriétaire.

Un helper 2.4.41 peut reprendre en phase VERIFYING un reçu déjà appliqué lié au helper 2.4.40 et aux services 2.4.35 : le reçu, le propriétaire, son processus, sa version et l’identité native doivent correspondre à des preuves courantes. Une divergence interrompt la reprise et préserve le reçu.
