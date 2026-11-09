import {
  PUBLIC_FORM_MESSAGE_MAX,
  PublicFormValidationError,
  validatePublicFormFields,
} from '../publicFormIntake';
import { submitHostedForm } from '../submitHostedForm';

describe('validatePublicFormFields', () => {
  it('matches Python atom codes', () => {
    expect(validatePublicFormFields({ name: '', email: 'a@b.c', message: 'hi' })).toBe(
      'invalid_name',
    );
    expect(validatePublicFormFields({ name: 'A', email: 'bad', message: 'hi' })).toBe(
      'invalid_email',
    );
    expect(validatePublicFormFields({ name: 'A', email: 'a@b.c', message: '' })).toBe(
      'invalid_message',
    );
    const long = 'x'.repeat(PUBLIC_FORM_MESSAGE_MAX + 1);
    expect(validatePublicFormFields({ name: 'A', email: 'a@b.c', message: long })).toBe(
      'message_too_long',
    );
    expect(validatePublicFormFields({ name: 'A', email: 'a@b.c', message: 'ok' })).toBeNull();
  });
});

describe('submitHostedForm', () => {
  it('fails fast before network', async () => {
    const fetchFn = jest.fn();
    await expect(
      submitHostedForm(1, { name: '', email: 'a@b.c', message: 'x' }, { fetchFn }),
    ).rejects.toBeInstanceOf(PublicFormValidationError);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
