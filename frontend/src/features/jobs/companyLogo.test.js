import { describe, expect, it } from 'vitest';
import { resolveCompanyLogoUrl } from './companyLogo';

describe('companyLogo', () => {
    it('resolves logos from explicit URL, domain, and known company name', () => {
        expect(resolveCompanyLogoUrl({ companyLogoUrl: 'logo.example.com/a.png' })).toBe('https://logo.example.com/a.png');
        expect(resolveCompanyLogoUrl({ companyDomain: 'skhynix.com' })).toBe('https://www.google.com/s2/favicons?domain=skhynix.com&sz=128');
        expect(resolveCompanyLogoUrl({ companyName: 'SK하이닉스' })).toBe('https://www.google.com/s2/favicons?domain=skhynix.com&sz=128');
    });

    it('does not use the job board source URL as the company logo domain', () => {
        expect(resolveCompanyLogoUrl({
            companyName: '알수없는회사',
            sourceUrl: 'https://www.jasoseol.com/recruit/123'
        })).toBeNull();
    });
});
