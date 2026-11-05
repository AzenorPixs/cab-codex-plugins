# Conception

Le parseur reconnaît, uniquement au premier niveau de l’objet littéral de
`request_validation`, le nom de propriété exact `commands` sous forme
JavaScript non quotée ou JSON quotée. Il exige les crochets et un seul
identifiant égal à la déclaration littérale préalable, puis remplace seulement
cet identifiant par la chaîne native échappée.

Toute clé `commands` qui ne respecte pas cette forme ou qui apparaît plus
d’une fois rend le wrapper ambigu et conserve le `execute` non normalisé. Les
autres propriétés, appels natifs, empreintes et gardes restent inchangés.

