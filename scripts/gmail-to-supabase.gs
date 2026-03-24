/**
 * Gmail → Supabase Support Sync
 * Sinkronizira mailove sa support@unitlift.com u Supabase contact_messages tablicu.
 *
 * SETUP:
 * 1. Otvori script.google.com → New Project → zalijepite ovaj kod
 * 2. Project Settings → Script Properties → dodaj:
 *    - SUPABASE_URL  = https://nvlrlubvxelrwdzggmno.supabase.co
 *    - SUPABASE_KEY  = <tvoj SUPABASE_SERVICE_ROLE_KEY>
 *    - SUPPORT_EMAIL = support@unitlift.com
 * 3. Pokreni syncSupportEmails() jednom ručno da prihvatiš Gmail permissions
 * 4. Dodaj trigger: Triggers → Add Trigger → syncSupportEmails → Time-driven → Every 5 minutes
 */

const SYNCED_LABEL_NAME = 'AdminSynced';

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    supabaseUrl: props.getProperty('SUPABASE_URL'),
    supabaseKey: props.getProperty('SUPABASE_KEY'),
    supportEmail: props.getProperty('SUPPORT_EMAIL') || 'support@unitlift.com',
  };
}

function syncSupportEmails() {
  const config = getConfig();

  if (!config.supabaseUrl || !config.supabaseKey) {
    Logger.log('ERROR: Nedostaje SUPABASE_URL ili SUPABASE_KEY u Script Properties.');
    return;
  }

  // Kreiraj Gmail label ako ne postoji
  let syncedLabel = GmailApp.getUserLabelByName(SYNCED_LABEL_NAME);
  if (!syncedLabel) {
    syncedLabel = GmailApp.createLabel(SYNCED_LABEL_NAME);
    Logger.log('Kreiran label: ' + SYNCED_LABEL_NAME);
  }

  // Traži mailove koji su primljeni na support email i još nisu obrađeni
  const query = `to:${config.supportEmail} -label:${SYNCED_LABEL_NAME}`;
  const threads = GmailApp.search(query, 0, 50);

  if (threads.length === 0) {
    Logger.log('Nema novih mailova.');
    return;
  }

  Logger.log(`Pronađeno ${threads.length} novih threadova.`);
  let synced = 0;
  let skipped = 0;

  threads.forEach(thread => {
    const messages = thread.getMessages();

    messages.forEach(msg => {
      const gmailId = msg.getId();
      const from = msg.getFrom();

      // Parsiranje emaila iz "Ime Prezime <email@domain.com>" formata
      const emailMatch = from.match(/<([^>]+)>/);
      const senderEmail = emailMatch ? emailMatch[1] : from.trim();
      const senderName = emailMatch
        ? from.replace(/<[^>]+>/, '').trim().replace(/^"|"$/g, '') || senderEmail
        : from.trim();

      const subject = msg.getSubject() || '(bez naslova)';
      const body = msg.getPlainBody().substring(0, 3000).trim();
      const date = msg.getDate();

      const payload = {
        gmail_id: gmailId,
        name: senderName || senderEmail,
        email: senderEmail,
        subject: subject,
        message: body || '(prazna poruka)',
        status: 'novo',
        created_at: date.toISOString(),
      };

      const response = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/contact_messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabaseKey,
            'Authorization': `Bearer ${config.supabaseKey}`,
            'Prefer': 'return=minimal,resolution=ignore-duplicates',
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
        }
      );

      const code = response.getResponseCode();
      if (code === 200 || code === 201) {
        synced++;
        Logger.log(`✓ Spremljeno: ${senderEmail} — ${subject}`);
      } else if (code === 409) {
        skipped++;
        Logger.log(`↩ Duplikat (preskočeno): ${gmailId}`);
      } else {
        Logger.log(`✗ Greška ${code}: ${response.getContentText()}`);
      }
    });

    // Označi thread kao obrađen
    thread.addLabel(syncedLabel);
  });

  Logger.log(`Gotovo. Novi: ${synced}, Duplikati: ${skipped}`);
}

/**
 * Ručno pokretanje za testiranje — provjeri Logs
 */
function testConnection() {
  const config = getConfig();
  const response = UrlFetchApp.fetch(
    `${config.supabaseUrl}/rest/v1/contact_messages?select=id&limit=1`,
    {
      method: 'GET',
      headers: {
        'apikey': config.supabaseKey,
        'Authorization': `Bearer ${config.supabaseKey}`,
      },
      muteHttpExceptions: true,
    }
  );
  Logger.log(`Status: ${response.getResponseCode()}`);
  Logger.log(`Response: ${response.getContentText()}`);
}
