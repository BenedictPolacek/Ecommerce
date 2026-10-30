import { passwordResetMail, verifyEmailMail } from '../../src/mail/templates.js';

describe('mail templates', () => {
  it('contains the link in the text and the HTML part', () => {
    const link = 'http://localhost:3000/verify-email?token=abc';
    const mail = verifyEmailMail({ to: 'a@b.de', firstName: 'Ana', link });

    expect(mail.to).toBe('a@b.de');
    expect(mail.text).toContain(link);
    expect(mail.html).toContain(`href="${link}"`);
  });

  it('escapes user input in the HTML part', () => {
    const mail = passwordResetMail({
      to: 'a@b.de',
      firstName: '<a href="https://evil.example">Click</a>',
      link: 'http://localhost:3000/reset-password?token=abc',
    });

    expect(mail.html).not.toContain('<a href="https://evil.example">');
    expect(mail.html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;');
  });
});
