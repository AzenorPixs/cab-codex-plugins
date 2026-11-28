## Pourquoi

La disponibilité des compteurs natifs peut être confirmée avec un relevé antérieur au passage. Un relevé qui suit de peu la validation échappe alors à la fenêtre d’attribution, même si le RUN et le passage sont terminés.

## Changements

- Ouvrir au début de chaque tentative un suivi CAB par rôle avec référence native si disponible.
- Rapprocher les relevés tardifs lorsqu'une preuve native identifie le passage. Conserver l'incertitude si plusieurs passages sont possibles.
- Exposer l'attente, les mesures et leurs limites dans le Résumé et les étapes. Vacante reste non exécutée.
- Qualifier sur PostgreSQL et dans Chromium et Firefox, puis publier avec CICDF et vérifier la version activée après CABU.

## Périmètre

Le cycle Publication, la collecte native et la projection de suivi. Les deux RUN historiques servent de références de lecture.
