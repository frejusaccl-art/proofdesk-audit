
## Vercel et le worker Gateway

Vercel documente maintenant les WebSockets dans les Functions, mais précise qu’une connexion se ferme lorsque la Function atteint sa durée maximale. L’état durable doit rester dans une base ou un datastore externe. Le guide Vercel de bot Discord utilise donc un listener Gateway borné dans le temps, relancé par un cron, et recommande de vérifier la durée maximale du plan.

Sources officielles vérifiées le 1er octobre 2026 :

- [Vercel WebSockets](https://vercel.com/docs/functions/websockets) — la connexion est attachée à une instance et se ferme à la durée maximale ; les reconnexions doivent être gérées.
- [Vercel Discord support bot](https://vercel.com/kb/guide/create-a-discord-support-bot-with-nuxt-and-redis) — Gateway forwarder borné, état Redis/base externe et redémarrage périodique par cron.

Conclusion pour ProofDesk : le site peut rester sur Vercel. Le worker Gateway permanent est plus fiable sur un processus continu. Une adaptation Vercel avec listener borné et cron est possible, mais elle ne doit être activée qu’après vérification de la durée maximale et du plan Vercel ; sinon elle crée des fenêtres où les messages peuvent être manqués.
