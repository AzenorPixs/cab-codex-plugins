# Qualifier les droits des runtimes publics Debian

Code non attribué ; dépendance corrective de la livraison SCM CAB autonome.

## Why
La qualification finale de3.0.1 sous UID1000 échoue sur un fichier Python vendor
root:root0750 issu de l’archive publique. Le service root reste READY mais un
nouveau client non root ne peut importer ses dépendances. Le développeur a
explicitement autorisé les modifications nécessaires au paquet Debian CAB.

## What Changes
Normaliser les droits des seuls runtimes publics extraits : dossiers0755,
fichiers0644 ou0755 selon leur caractère exécutable ; aucun état privé touché.
Tester sous umask0077 et par import/exécution sous un autre UID. Livrer3.0.2 par
DIU sans réutiliser le tag3.0.1 et conserver les reçus antérieurs.

## Impact
package_install.py, tests, contrat system-platform, versions et documentation.
Aucune dépendance ni migration SQL ; aucune modification des comptes/profils SSH.
