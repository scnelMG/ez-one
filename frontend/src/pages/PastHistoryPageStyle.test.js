import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PastHistoryPage styles', () => {
    const styles = readFileSync(resolve(__dirname, '../styles.css'), 'utf-8');

    it('HISTORY-003/HISTORY-008: keeps result labels from crowding deadline text', () => {
        const tableGridRule = styles.match(/\.history-table-head,\n\.history-row \{[^}]+}/)?.[0] ?? '';
        const resultCellRule = styles.match(/\.history-row > :nth-child\(4\) \{[^}]+}/)?.[0] ?? '';
        const deadlineCellRule = styles.match(/\.history-row \.deadline-cell \{[^}]+}/)?.[0] ?? '';
        const resultSelectRule = styles.match(/\.history-result-select \{[^}]+}/)?.[0] ?? '';

        expect(tableGridRule).toContain('minmax(152px, 0.74fr)');
        expect(tableGridRule).toContain('minmax(176px, 0.78fr)');
        expect(tableGridRule).toContain('min-width: 1060px;');
        expect(resultCellRule).toContain('padding-right: 12px;');
        expect(deadlineCellRule).toContain('justify-self: stretch;');
        expect(deadlineCellRule).toContain('padding-left: 8px;');
        expect(resultSelectRule).toContain('width: min(132px, 100%);');
    });
});
