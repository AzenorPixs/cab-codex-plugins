# Conception — code non attribué

Les profils 390, 768, 1366, 1920, 2560 et 3840 px reçoivent deux multiplicateurs de 50 à 150 %, initialisés à 100 %. La largeur CSS du navigateur détermine une interpolation linéaire bornée. Le multiplicateur d’interface utilise le zoom CSS ; celui des polices se combine au réglage global existant.

L’API conserve les préférences existantes et met à jour atomiquement une projection PostgreSQL dédiée, limitée aux préférences publiques. Electric diffuse cette projection aux pages ouvertes. Les requêtes des anciens clients ne réinitialisent pas les profils omis.
