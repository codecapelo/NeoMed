const BRAZIL_COUNTRY_CODE = '55';
const BRAZIL_MAX_NATIONAL_DIGITS = 11;

export const onlyDigits = (value: string) => String(value || '').replace(/\D/g, '');

export const extractBrazilNationalPhoneDigits = (value: string): string => {
  let digits = onlyDigits(value);

  if (!digits) {
    return '';
  }

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    if (digits.length === BRAZIL_COUNTRY_CODE.length) {
      return '';
    }

    if (digits.length > BRAZIL_MAX_NATIONAL_DIGITS) {
      digits = digits.slice(BRAZIL_COUNTRY_CODE.length);
    }
  }

  return digits.slice(0, BRAZIL_MAX_NATIONAL_DIGITS);
};

export const normalizePhoneWithBrazilCountryCode = (
  value: string,
  options: { keepPrefixWhenEmpty?: boolean } = {}
): string => {
  const nationalDigits = extractBrazilNationalPhoneDigits(value);
  if (!nationalDigits) {
    return options.keepPrefixWhenEmpty ? '+55' : '';
  }

  return `+55${nationalDigits}`;
};

export const hasBrazilPhoneDigits = (value: string, minLength = 10): boolean => {
  return extractBrazilNationalPhoneDigits(value).length >= minLength;
};
