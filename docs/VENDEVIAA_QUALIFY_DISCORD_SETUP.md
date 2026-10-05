
## Notifications de conversion

Les demandes de pilote et de rendez-vous sont persistées dans `auditEvents` et apparaissent dans le cockpit Qualify. Pour recevoir aussi une notification e-mail interne, configurer dans Vercel :

```env
RESEND_API_KEY=à renseigner dans Vercel
RESEND_FROM_EMAIL=adresse d’envoi vérifiée
RESEND_LEADS_TO=adresse interne de réception
```

Si `RESEND_LEADS_TO` n’est pas configurée, l’enregistrement du lead continue normalement et aucune notification n’est envoyée.
