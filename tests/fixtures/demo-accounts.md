# Comptes de démonstration (fictifs)

**Aucun mot de passe n'est versionné.** Les comptes de démonstration sont créés par inscription sur `/auth`
avec un mot de passe choisi au moment de la démo et transmis hors dépôt, puis rattachés par l'opérateur.

| Rôle | Nom | E-mail | Rattachement |
|---|---|---|---|
| Admin | Koffi Gérant | gerant@demo.test | `setup:bootstrap` (premier admin) ou `setup:attachAccount` |
| Étudiante | Awa Test | awa.etudiante@demo.test | `setup:attachAccount` rôle `student` |

Les e-mails en `.test` sont réservés (RFC 2606) : aucune boîte réelle. Données fictives uniquement.

## Rotation avant publication du dépôt (faite le 21/11)
Un mot de passe de démonstration a été versionné dans des commits antérieurs (`ef1b2f5`, `3f74952`) et n'est plus
utilisable comme secret. Il ne concerne que le déploiement Convex **dev**. Ces trois comptes ont été supprimés du déploiement dev le 21/11 (voir `docs/DEPLOYMENT.md`, étape 1) : le mot de passe
de l'historique ne donne plus accès à rien. Les comptes de démo jury seront créés en prod avec de nouveaux mots de passe.
