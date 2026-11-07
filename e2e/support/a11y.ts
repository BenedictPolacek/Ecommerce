import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// WCAG 2.1 level A and AA (what the EU Accessibility Act, in force since June 2025, expects
// from online shops) plus axe's best practices, e.g. no skipped heading levels
const RULE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

/**
 * Scans the current page with axe and fails with a readable list of violations.
 * axe finds about half of all accessibility problems automatically (contrast, labels,
 * names, landmarks, ARIA); keyboard use and screen reader wording still need a human.
 */
export async function expectNoA11yViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(RULE_TAGS).analyze();

  const report = violations.map(
    (violation) =>
      `${violation.impact}: ${violation.id} – ${violation.help}\n` +
      violation.nodes.map((node) => `    ${node.target.join(' ')}`).join('\n')
  );
  expect(report, `Accessibility violations on ${page.url()}`).toEqual([]);
}
