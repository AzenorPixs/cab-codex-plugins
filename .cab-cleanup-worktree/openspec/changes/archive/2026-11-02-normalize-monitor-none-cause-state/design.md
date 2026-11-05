# Conception

`normalizeRuns` transforme uniquement la sentinelle exacte `NONE` du champ
cause en absence (`null`). `operationalState` ignore défensivement cette même
sentinelle si un consommateur lui transmet directement un RUN non normalisé.
Les causes réelles, readiness, pending, gates et états de réservation gardent
leur priorité et leur comportement actuel.
