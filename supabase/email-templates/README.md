# Nederlandse Supabase e-mails

Supabase beheert auth-mails via het dashboard. Plak deze onderwerpen en HTML in:

`Authentication` -> `Email Templates`

Gebruik dezelfde Site URL als de app:

```text
https://mijn-graaf-van-schuyt.vercel.app
```

## Confirm signup

Onderwerp:

```text
Bevestig je account voor Mijn Graaf van Schuyt
```

HTML:

```html
<div style="font-family: Arial, sans-serif; color: #24302f; background: #f7f3ea; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fffdf8; border: 1px solid #ded6c8; border-radius: 8px; padding: 24px;">
    <p style="margin: 0 0 8px; color: #64706e; font-size: 13px; font-weight: 700; text-transform: uppercase;">Appartementencomplex</p>
    <h1 style="margin: 0 0 14px; font-size: 24px; line-height: 1.15;">Mijn Graaf van Schuyt</h1>
    <p style="font-size: 16px; line-height: 1.55;">Welkom. Bevestig je e-mailadres om je account te activeren.</p>
    <p style="font-size: 16px; line-height: 1.55;">Daarna kun je inloggen met je e-mailadres en wachtwoord.</p>
    <p style="margin: 24px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #34675c; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 13px 18px; font-weight: 700;">Account bevestigen</a>
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64706e;">Heb je dit account niet zelf aangemaakt? Dan kun je deze e-mail negeren.</p>
  </div>
</div>
```

## Reset password

Onderwerp:

```text
Nieuw wachtwoord instellen voor Mijn Graaf van Schuyt
```

HTML:

```html
<div style="font-family: Arial, sans-serif; color: #24302f; background: #f7f3ea; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fffdf8; border: 1px solid #ded6c8; border-radius: 8px; padding: 24px;">
    <p style="margin: 0 0 8px; color: #64706e; font-size: 13px; font-weight: 700; text-transform: uppercase;">Appartementencomplex</p>
    <h1 style="margin: 0 0 14px; font-size: 24px; line-height: 1.15;">Mijn Graaf van Schuyt</h1>
    <p style="font-size: 16px; line-height: 1.55;">Je kunt via de knop hieronder een nieuw wachtwoord instellen.</p>
    <p style="margin: 24px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #34675c; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 13px 18px; font-weight: 700;">Nieuw wachtwoord instellen</a>
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #64706e;">Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.</p>
  </div>
</div>
```
