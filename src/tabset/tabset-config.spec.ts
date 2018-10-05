import {NgbTabsetConfig} from './tabset-config';
import {NgbConfig} from '../tokens';

describe('ngb-tabset-config', () => {
  it('should have sensible default values', () => {
    const config = new NgbTabsetConfig(new NgbConfig());

    expect(config.type).toBe('tabs');
    expect(config.justify).toBe('start');
  });
});
