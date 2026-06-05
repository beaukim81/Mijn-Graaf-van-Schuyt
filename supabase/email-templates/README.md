# Nederlandse Supabase e-mails

Supabase beheert auth-mails via het dashboard. Plak deze onderwerpen en HTML in:

`Authentication` -> `Emails` -> `Templates`

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
<div style="font-family: Arial, sans-serif; background: #f7f4ef; padding: 22px; color: #24352f;">
  <div style="max-width: 520px; margin: 0 auto; background: #fffdf8; border: 1px solid #ded8cc; border-radius: 14px; padding: 22px;">
    <p style="margin: 0 0 6px; color: #6f8068; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">Mijn Graaf van Schuyt</p>
    <h1 style="margin: 0 0 14px; color: #24352f; font-size: 22px; line-height: 1.25;">Account bevestigen</h1>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 14px;">Welkom bij de bewonersapp van Graaf van Schuyt.</p>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 20px;">Bevestig je e-mailadres via de knop hieronder.</p>
    <p style="margin: 22px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #6f8068; color: #ffffff; text-decoration: none; border-radius: 12px; padding: 12px 18px; font-size: 15px; font-weight: 700;">Account bevestigen</a>
    </p>
    <div style="background: #f0eee7; border-radius: 12px; padding: 14px; margin-top: 20px;">
      <p style="font-size: 13px; line-height: 1.5; color: #5f6b65; margin: 0;">Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren.</p>
    </div>
  </div>
</div>
```

## Invite user / activatiemail

Gebruik deze template voor bewoners die door beheer zijn goedgekeurd.

Onderwerp:

```text
Je toegang tot Mijn Graaf van Schuyt is goedgekeurd
```

HTML:

```html
<div style="font-family: Arial, sans-serif; background: #f7f4ef; padding: 22px; color: #24352f;">
  <div style="max-width: 520px; margin: 0 auto; background: #fffdf8; border: 1px solid #ded8cc; border-radius: 14px; padding: 22px;">
    <p style="margin: 0 0 6px; color: #6f8068; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">Mijn Graaf van Schuyt</p>
    <h1 style="margin: 0 0 14px; color: #24352f; font-size: 22px; line-height: 1.25;">Je aanvraag is goedgekeurd</h1>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 14px;">Je kunt nu je account activeren voor de bewonersapp.</p>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 20px;">Klik op de knop hieronder en stel daarna je eigen wachtwoord in.</p>
    <p style="margin: 22px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #6f8068; color: #ffffff; text-decoration: none; border-radius: 12px; padding: 12px 18px; font-size: 15px; font-weight: 700;">Account activeren</a>
    </p>
    <div style="background: #f0eee7; border-radius: 12px; padding: 14px; margin-top: 20px;">
      <p style="font-size: 13px; line-height: 1.5; color: #5f6b65; margin: 0;">Werkt de knop niet? Open dan de link opnieuw of vraag beheer om een nieuwe activatiemail.</p>
    </div>
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
<div style="font-family: Arial, sans-serif; background: #f7f4ef; padding: 22px; color: #24352f;">
  <div style="max-width: 520px; margin: 0 auto; background: #fffdf8; border: 1px solid #ded8cc; border-radius: 14px; padding: 22px;">
    <p style="margin: 0 0 6px; color: #6f8068; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">Mijn Graaf van Schuyt</p>
    <h1 style="margin: 0 0 14px; color: #24352f; font-size: 22px; line-height: 1.25;">Nieuw wachtwoord instellen</h1>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 20px;">Je kunt via de knop hieronder een nieuw wachtwoord kiezen.</p>
    <p style="margin: 22px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #6f8068; color: #ffffff; text-decoration: none; border-radius: 12px; padding: 12px 18px; font-size: 15px; font-weight: 700;">Nieuw wachtwoord instellen</a>
    </p>
    <div style="background: #f0eee7; border-radius: 12px; padding: 14px; margin-top: 20px;">
      <p style="font-size: 13px; line-height: 1.5; color: #5f6b65; margin: 0;">Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.</p>
    </div>
  </div>
</div>
```

## Change email address

Gebruik deze template voor de mail naar het nieuwe e-mailadres.

Onderwerp:

```text
Bevestig je nieuwe e-mailadres voor Mijn Graaf van Schuyt
```

HTML:

```html
<div style="font-family: Arial, sans-serif; background: #f7f4ef; padding: 22px; color: #24352f;">
  <div style="max-width: 520px; margin: 0 auto; background: #fffdf8; border: 1px solid #ded8cc; border-radius: 14px; padding: 22px;">
    <p style="margin: 0 0 6px; color: #6f8068; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">Mijn Graaf van Schuyt</p>
    <h1 style="margin: 0 0 14px; color: #24352f; font-size: 22px; line-height: 1.25;">Nieuw e-mailadres bevestigen</h1>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 14px;">Je hebt gevraagd om je e-mailadres voor de bewonersapp te wijzigen.</p>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 20px;">Bevestig je nieuwe e-mailadres via de knop hieronder. Daarna kun je daarmee inloggen.</p>
    <p style="margin: 22px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #6f8068; color: #ffffff; text-decoration: none; border-radius: 12px; padding: 12px 18px; font-size: 15px; font-weight: 700;">Nieuw e-mailadres bevestigen</a>
    </p>
    <div style="background: #f0eee7; border-radius: 12px; padding: 14px; margin-top: 20px;">
      <p style="font-size: 13px; line-height: 1.5; color: #5f6b65; margin: 0;">Heb je dit niet zelf aangevraagd? Klik dan niet op de knop. Gebruik de melding die naar je oude e-mailadres is gestuurd of neem contact op met beheer.</p>
    </div>
  </div>
</div>
```

## Email address changed notification

Gebruik deze template voor de beveiligingsmelding naar het oude e-mailadres.

Onderwerp:

```text
E-mailadres gewijzigd voor Mijn Graaf van Schuyt
```

HTML:

```html
<div style="font-family: Arial, sans-serif; background: #f7f4ef; padding: 22px; color: #24352f;">
  <div style="max-width: 520px; margin: 0 auto; background: #fffdf8; border: 1px solid #ded8cc; border-radius: 14px; padding: 22px;">
    <p style="margin: 0 0 6px; color: #6f8068; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">Mijn Graaf van Schuyt</p>
    <h1 style="margin: 0 0 14px; color: #24352f; font-size: 22px; line-height: 1.25;">E-mailadres gewijzigd</h1>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 14px;">Het e-mailadres van je account bij Mijn Graaf van Schuyt is gewijzigd.</p>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 14px;">Was jij dit zelf? Dan hoef je niets te doen.</p>
    <p style="font-size: 15px; line-height: 1.55; margin: 0 0 20px;">Herken je deze wijziging niet? Meld dit dan aan beheer.</p>
    <p style="margin: 22px 0;">
      <a href="{{ .SiteURL }}/veiligheid/email-wijziging?email={{ .OldEmail }}&nieuwe_email={{ .Email }}" style="display: inline-block; background: #8a4b45; color: #ffffff; text-decoration: none; border-radius: 12px; padding: 12px 18px; font-size: 15px; font-weight: 700;">Dit was ik niet</a>
    </p>
    <div style="background: #f0eee7; border-radius: 12px; padding: 14px; margin-top: 20px;">
      <p style="font-size: 13px; line-height: 1.5; color: #5f6b65; margin: 0;">Deze melding is automatisch verstuurd voor de veiligheid van je account.</p>
    </div>
  </div>
</div>
```
