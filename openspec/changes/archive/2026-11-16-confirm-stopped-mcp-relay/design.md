# Conception — code non attribué

La confirmation administrative est liée au reçu de mise à jour et au relais exact. CAB vérifie l’arrêt observé du relais et de son moteur avec pidfd, l’identité de la cible, l’absence de requêtes et d’incertitude ainsi que la frontière d’opérations et de baux. Une décision idempotente est conservée avec son acteur et projetée comme DISCONNECTED ; elle ne constitue pas une preuve de reconnexion. Un relais préexistant de la même instance n’est pas considéré comme un nouveau remplacement.
