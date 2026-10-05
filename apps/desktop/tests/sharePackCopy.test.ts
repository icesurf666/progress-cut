import { describe, expect, it } from 'vitest';
import { buildPostTemplates } from '../src/main/pipeline/sharePackCopy.js';

describe('share pack copy', () => {
  it('keeps machine facts and human context separate', () => {
    const templates = buildPostTemplates({
      recordingDurationMs: 65_000,
      observations: 50,
      distinctFrames: 8,
      moments: 5,
    });
    expect(templates['x.md']).toContain('1m 5s of work into 5 visual moments');
    expect(templates['x.md']).toContain('[Add what you built in this session]');
    expect(templates['dev-to-outline.md']).toContain('50 observed frames');
  });
});
