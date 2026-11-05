# Statistiques SCM — compatibilité historique CAB 1.10.1

## 1. Statistiques générales et décisions

Session directe SCM. Validation humaine : compatibilité des clés historiques et récupération en avant sous le même journal/HELD, puis mise à jour locale et reprise CISMP sans fermer OpenCode. Modèle exact, tokens, quotas et durée intégrale : N/A, non relevés. Aucun skill de statistiques pilotées invoqué.

## 2. Types de messages et d'outils

Comptage exhaustif des messages/outils : N/A, absence de mesure initiale. Tests ciblés : 76/76 réussis. Suite Node complète : 397 déclarés, 371 réussis, 0 échec, 26 ignorés ; les 76 ciblés sont inclus dans ces 371 et ne sont pas additionnés. Les 26 ignorés concernent 25 bancs à paquet historique 1.7.1 absent et 1 banc natif optionnel non activé. Le banc de récupération Docker est compté séparément.

## 3. Fichiers modifiés

12 fichiers source, tests et supports contrôlés par empreintes dans PREUVES-SCM.json, dont le nouvel outil de réparation. Deux spécifications synchronisées et sept artefacts archivés (métadonnée, proposition, conception, tâches, deux deltas et qualification), plus preuves et présent rapport. resource-coordination.mjs, update.mjs et commande /cab inchangés pour ce correctif. Aucune suppression source, aucun état Git inspecté ou préparé. Nombre de lignes modifiées : N/A, aucun diff Git effectué.

## 4. Commandes

26 vérifications syntaxiques réussies (25 Node et 1 Python) ; les deux fichiers modifiés ensuite sont recontrôlés. Banc deux UID réels : 40 RUN, 256 ressources par RUN, HTTP 5 218 610 octets et fichier privé 5 657 063 octets. Échec du lecteur reproduit, puis quatre briques 1.10.1, même transaction/génération et OpenCode conservé. Refus d'autorité, HELD, code, pointeur et autorisation ; interruptions du plan récupérées, idempotence et anciennes releases/stages préservés. Lecture de la copie réelle : 43 RUN, 3 063 opérations, 3 308 accès, empreinte conservée. OpenSpec ciblé strict et archivage réussis : deux exigences ajoutées, zéro modification/suppression/renommage d'exigence. Les échecs de mise au point ont été corrigés et le banc final a réussi ; aucun résultat final en échec n'est masqué.

## 5. Accès web

Aucune recherche documentaire externe. HTTP loopback du banc et contrôle de santé local ; nombre exhaustif : N/A, non mesuré. Docker network=none, UID 1000/1002 isolés ; aucun compte ou droit hôte modifié. Aucun secret, environnement brut ou génération fournisseur transmis.

## 6. Synthèse globale

Sources qualifiées : clés historiques conservées sans nouvelle réservation non canonique et récupération ciblée sous l'autorité existante. Le registre métier et les anciennes releases restent préservés. L'activation locale et la reprise CISMP sont distinctes et ne sont pas déduites de l'archive. Mesures absentes en N/A motivé ; six sections, totaux et UTF-8/LF vérifiés.
