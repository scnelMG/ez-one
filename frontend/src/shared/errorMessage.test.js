import { describe, expect, it } from 'vitest';
import { messageFromError } from './errorMessage';

describe('messageFromError', () => {
    it('uses API envelope error messages before Axios fallback text', () => {
        const error = new Error('Request failed with status code 400');
        error.response = {
            data: {
                success: false,
                error: {
                    message: 'Notion OAuth client ID is not configured.'
                }
            }
        };

        expect(messageFromError(error, 'Notion 계정을 연결하지 못했습니다.')).toBe(
            'Notion OAuth client ID is not configured.'
        );
    });
});
