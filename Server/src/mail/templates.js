// Names come from user input: escape them, or a name like "<a href=...>" ends up as HTML in the mail
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );

/**
 * Every mail has a plain-text part (some clients and spam filters prefer it) and an HTML part
 */
const layout = ({ firstName, paragraphs, link, linkText }) => {
  const text = [`Hello ${firstName},`, '', ...paragraphs, ...(link ? ['', link] : [])].join('\n');

  const html = [
    `<p>Hello ${escapeHtml(firstName)},</p>`,
    ...paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
    ...(link ? [`<p><a href="${escapeHtml(link)}">${escapeHtml(linkText)}</a></p>`] : []),
  ].join('\n');

  return { text, html };
};

export const verifyEmailMail = ({ to, firstName, link }) => ({
  to,
  subject: 'Please confirm your email address',
  ...layout({
    firstName,
    paragraphs: [
      'Please confirm your email address to be able to place orders.',
      'The link is valid for 24 hours.',
    ],
    link,
    linkText: 'Confirm email address',
  }),
});

export const passwordResetMail = ({ to, firstName, link }) => ({
  to,
  subject: 'Reset your password',
  ...layout({
    firstName,
    paragraphs: [
      'Someone asked to reset the password of your account. The link is valid for 1 hour.',
      'If this was not you, ignore this email: your password stays unchanged.',
    ],
    link,
    linkText: 'Choose a new password',
  }),
});

export const accountDeletedMail = ({ to, firstName }) => ({
  to,
  subject: 'Your account has been deleted',
  ...layout({
    firstName,
    paragraphs: [
      'Your account and its personal data have been deleted.',
      'Past orders are kept as long as the law requires us to keep invoices.',
    ],
  }),
});

export const passwordChangedMail = ({ to, firstName }) => ({
  to,
  subject: 'Your password was changed',
  ...layout({
    firstName,
    paragraphs: [
      'The password of your account was just changed and other devices were logged out.',
      'If this was not you, reset your password right away and contact our support.',
    ],
  }),
});
