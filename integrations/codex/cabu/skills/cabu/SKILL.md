---
name: CABU
description: Actualiser le paquet Debian CAB et vérifier le service sur le même reçu.
---

# CABU 3.0.0

Sur demande explicite de mise à jour, exécuter `sudo cab update` jusqu’au reçu
terminal. Une provenance locale explicitement autorisée peut utiliser
`sudo cab update --package /chemin/paquet.deb`. Ne pas créer de RUN.

Le paquet arrête cab.service à frontière sûre, installe les runtimes publics
hors réseau, applique les migrations d’une base déjà initialisée, redémarre et
vérifie le service sur le même reçu. PostgreSQL reste indépendant. Ne jamais
réinitialiser ou restaurer un état ancien après un effet incertain. Une absence
de reçu ne prouve pas une absence d’effet.

Distinguer version du paquet, version active et état Web. Une installation
neuve expose le parcours8790 sans créer sa base. Le développeur initialise par
le Web ; ne pas inventer son compte ou son mot de passe.
