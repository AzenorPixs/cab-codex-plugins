# Conception

Sur l’hôte, deux sessions Codex dans des dossiers différents ont utilisé un seul processus stdio avec le partage natif et un dossier MCP fixe. Le client transmet le contexte de la session dans les métadonnées, y compris sur les appels concurrents. CAB vérifie ce contexte par rapport à la session native du RUN et stocke une association par liaison et session. L’absence de contexte dans le transport partagé interdit les opérations liées au RUN.

L’inventaire de surveillance compte les liaisons actives par agent, tous comptes confondus. La remédiation privilégie l’API native, puis utilise la reprise de bureau CABU lorsque le profil partagé, le binaire et l’instance sont observés et que les protections d’exécution l’autorisent. La reprise automatique exige une installation locale vérifiée et réutilise le reçu sans réinstaller. Après la reprise, une unique liaison observée, avec relais, moteur et catalogue à la version déployée, confirme la convergence.
