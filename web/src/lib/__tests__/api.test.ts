import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../api';

describe('api', () => {
  it('default API URL is localhost:4000 when env unset', () => {
    expect(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').toBe(
      'http://localhost:4000'
    );
  });

  describe('getErrorMessage', () => {
    it('returns friendly message for network errors', () => {
      expect(getErrorMessage(new Error('Failed to fetch'))).toBe('Проверьте подключение к интернету');
      expect(getErrorMessage(new Error('NetworkError when attempting to fetch resource'))).toBe('Проверьте подключение к интернету');
    });
    it('returns original message for other errors', () => {
      expect(getErrorMessage(new Error('Сервис поиска фильмов временно недоступен. Попробуйте позже.'))).toBe('Сервис поиска фильмов временно недоступен. Попробуйте позже.');
      expect(getErrorMessage(new Error('Некорректный email или пароль'))).toBe('Некорректный email или пароль');
    });
    it('returns generic message for non-Error', () => {
      expect(getErrorMessage('string')).toBe('Произошла ошибка');
    });
  });
});
