# Vendeviaa Qualify — Préparation de l’intégration Discord

## État

Le premier socle du module Qualify est maintenant présent dans ProofDesk :

- tables `qualifyProspects`, `qualifyMessages` et `qualifyNotes` ;
- API privée pour le dashboard ;
- statuts commerciaux ;
- niveau d’intérêt ;
- conservation de l’historique ;
- notes privées ;
- mode `active` / `human` ;
- dashboard administrateur `/qualify`.

Le bot Discord réel ne doit pas être activé tant que les identifiants de l’application Discord et le mode de réception des messages ne sont pas définis.

## Pourquoi une connexion persistante est nécessaire

Le besoin prévu est une conversation libre : le membre écrit un message, l’agent le lit, mémorise la réponse et continue l’audit.

Discord documente deux mécanismes différents :

1. **Gateway WebSocket** : connexion persistante qui reçoit les événements de messages et doit gérer les reconnexions et heartbeats.
2. **Interactions HTTP** : endpoint pour les slash commands, boutons, menus et modales.

Les interactions HTTP seules ne suffisent pas à recevoir naturellement tous les messages libres d’un prospect. Pour une conversation progressive dans un canal ou un message privé, le Gateway est le mécanisme principal. La réception du contenu des messages nécessite l’intent privilégié `MESSAGE_CONTENT`, à activer dans le portail développeur Discord.

Sources officielles :

- [Discord Gateway](https://docs.discord.com/developers/events/gateway)
- [Discord Gateway Events](https://docs.discord.com/developers/events/gateway-events)
- [Discord Receiving and Responding to Interactions](https://docs.discord.com/developers/interactions/receiving-and-responding)

## Deux options réalistes

| Approche | Résultat | Avantages | Limites |
|---|---|---|---|
| **Bot Gateway hébergé en continu** | Le bot lit les messages, répond, conserve le contexte et fonctionne comme un vrai agent conversationnel | Correspond exactement au besoin ; temps réel ; mémoire par Discord ID ; prise en main humaine fiable | Nécessite un processus toujours actif et les intents Discord appropriés |
| **Interactions HTTP uniquement** | Le bot répond aux slash commands, boutons et formulaires | Plus simple à héberger ; pas de connexion WebSocket permanente | Ne remplace pas une conversation libre ; le prospect doit utiliser des commandes ou des modales |

**Recommandation produit :** l’option Gateway correspond au fonctionnement souhaité. Elle sera activée après réception des éléments Discord et choix de l’hébergement continu.

## Informations à préparer

Ne jamais envoyer le token du bot dans une conversation. Il devra être ajouté dans les secrets du projet ou dans l’environnement d’hébergement.

À préparer :

- Application ID Discord ;
- Bot User ID ;
- Server/Guild ID ;
- Channel ID ou catégorie d’accueil ;
- rôle éventuel à attribuer ;
- compte ou rôle administrateur autorisé à prendre la main ;
- texte d’accueil définitif ;
- questions de qualification ;
- critères précis d’un prospect chaud ;
- canal de notification ;
- lien de rendez-vous ;
- durée de conservation des conversations.

Le **Bot Token** sera saisi uniquement dans le gestionnaire de secrets. Il ne doit pas être commité dans GitHub, copié dans un fichier public ou envoyé dans le chat.

Variables attendues par le worker :

```text
DISCORD_BOT_TOKEN=à renseigner dans les secrets uniquement
DISCORD_GUILD_ID=ID du serveur de test
DISCORD_CHANNEL_ID=ID du canal de qualification (optionnel si les messages privés sont retenus)
DISCORD_ADMIN_USER_IDS=IDs Discord des opérateurs, séparés par des virgules
DATABASE_URL=base ProofDesk existante
```

Commande locale ou hébergée :

```bash
pnpm discord:worker
```

Le worker utilise le Gateway Discord v10, renvoie les messages via l’API Discord et conserve chaque message dans les tables Qualify. Il ne démarre pas sans `DISCORD_BOT_TOKEN`.

## Intentions Discord à prévoir

Pour une première version conversationnelle, demander uniquement les permissions nécessaires :

- réception des messages dans les canaux autorisés ;
- réception des messages directs si ce mode est retenu ;
- envoi de messages ;
- lecture de l’historique nécessaire ;
- accès aux informations de base du membre ;
- intent `MESSAGE_CONTENT` si le bot doit lire le contenu libre des messages.

Les permissions administrateur globales sont à éviter.

## Contrat de synchronisation

### À la réception d’un membre ou message

1. retrouver le prospect par `discordUserId` ;
2. créer le profil s’il n’existe pas ;
3. enregistrer le message original ;
4. mettre à jour `lastActivityAt` ;
5. vérifier `agentMode` ;
6. si `human`, ne pas répondre ;
7. si `active`, déterminer l’étape d’audit ;
8. éviter toute question déjà posée ;
9. écrire la réponse de l’agent dans `qualifyMessages` ;
10. mettre à jour le profil structuré ;
11. recalculer l’intérêt et le statut selon des règles explicables ;
12. notifier l’administrateur si le prospect devient chaud.

### Règles de non-invention

Si le message est ambigu :

> « Je ne suis pas certain d’avoir bien compris. Peux-tu préciser ? »

L’agent ne doit pas inventer une entreprise, un budget, une urgence, un besoin ou une intention d’achat. Une donnée inconnue reste `unknown` ou vide.

### Règle de reprise

Un membre quittant Discord puis revenant doit être retrouvé par son Discord ID. Son audit et son historique ne doivent pas être recréés. Le bot peut reprendre à la prochaine question non complétée.

## Règles de prise en main

Lorsque l’administrateur déclenche **Prendre la main** :

- `agentMode = human` ;
- l’agent ne répond plus à ce prospect ;
- les messages continuent d’être enregistrés ;
- les notes privées restent privées ;
- le dashboard affiche clairement le mode humain.

Lorsque l’administrateur déclenche **Rendre la main** :

- `agentMode = active` ;
- l’agent reprend uniquement à partir du contexte conservé ;
- il ne recommence pas l’audit ;
- il doit éventuellement demander une confirmation avant de reprendre.

## Hébergement

Le site et le dashboard peuvent continuer à être servis par l’infrastructure WebDev/Vercel existante. Le bot Gateway doit être exécuté dans un processus capable de rester connecté en continu.

Deux chemins sont possibles :

1. hébergement managé avec un processus réservé toujours actif ;
2. serveur persistant indépendant si des besoins de runtime, de contrôle réseau ou de charge apparaissent.

Le choix doit être fait avant de brancher le token du bot. Le stockage des profils reste dans la base ProofDesk, pas dans la mémoire du processus Discord.

## Séquence d’activation

1. créer ou sélectionner l’application Discord ;
2. configurer le bot et ses intents minimaux ;
3. inviter le bot dans un serveur de test ;
4. renseigner les IDs, jamais le token dans le code ;
5. activer un canal de test ;
6. envoyer un message de test ;
7. vérifier la création d’un prospect ;
8. vérifier la conservation du message ;
9. vérifier la reprise par Discord ID ;
10. vérifier `Prendre la main` ;
11. vérifier une notification de prospect chaud ;
12. tester une ambiguïté et l’abstention de l’agent ;
13. tester suppression et export des données ;
14. seulement ensuite ouvrir le bot à la communauté.

## Critères de réussite du module Discord

- un membre est reconnu par son Discord ID ;
- un audit ne recommence jamais inutilement ;
- chaque message est conservé dans l’ordre ;
- les notes et statuts internes ne sont jamais visibles côté Discord ;
- l’agent demande une précision au lieu d’inventer ;
- la prise en main stoppe l’agent pour le seul prospect ciblé ;
- la restitution de main reprend le contexte correct ;
- les notifications contiennent un résumé non sensible et un lien vers le dashboard ;
- un départ puis retour du membre restaure son profil ;
- une erreur Discord ou base ne détruit pas l’historique ;
- le token n’apparaît ni dans les logs ni dans GitHub.
