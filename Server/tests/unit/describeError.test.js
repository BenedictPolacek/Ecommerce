import { describeError } from '../../src/db/describe-error.js';

describe('describeError', () => {
  it('shows code and message of a normal error', () => {
    const error = Object.assign(new Error('password authentication failed'), { code: '28P01' });
    expect(describeError(error)).toBe('28P01 password authentication failed');
  });

  it('shows the reasons inside an AggregateError with an empty message', () => {
    const timeout = Object.assign(new Error('connect ETIMEDOUT 1.2.3.4:5432'), {
      code: 'ETIMEDOUT',
    });
    const error = new AggregateError([timeout, timeout], '');
    expect(describeError(error)).toBe('ETIMEDOUT connect ETIMEDOUT 1.2.3.4:5432');
  });

  it('never returns an empty text', () => {
    expect(describeError(new Error(''))).toBe('Error');
    expect(describeError('boom')).toBe('boom');
  });
});
