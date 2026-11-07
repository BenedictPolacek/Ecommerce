import { expect, type APIRequestContext } from '@playwright/test';
import { MAILPIT_URL } from './env';

interface MailSummary {
  ID: string;
  Subject: string;
}

/**
 * Waits for the newest email to `to` whose subject matches, and returns its text.
 * Mailpit has a small REST API (https://mailpit.axllent.org/docs/api-v1/).
 */
export async function waitForMail(request: APIRequestContext, to: string, subject: RegExp) {
  let found: MailSummary | undefined;

  // Sending happens in the background after the API answered: poll for a moment
  await expect
    .poll(
      async () => {
        const res = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${to}"` },
        });
        const { messages } = (await res.json()) as { messages: MailSummary[] };
        found = messages.find((message) => subject.test(message.Subject));
        return found;
      },
      { message: `email to ${to} matching ${subject}`, timeout: 15_000 }
    )
    .toBeTruthy();

  const res = await request.get(`${MAILPIT_URL}/api/v1/message/${found!.ID}`);
  const { Text } = (await res.json()) as { Text: string };
  return Text;
}

/** The first link in an email, e.g. the verification link */
export function linkIn(text: string) {
  const match = text.match(/https?:\/\/\S+/);
  if (!match) throw new Error(`No link in email:\n${text}`);
  return match[0];
}
