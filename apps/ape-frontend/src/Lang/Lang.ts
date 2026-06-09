


export function nameFromCode(code: string) {
  switch (code) {
    case 'en': return 'English';
    case 'ar': return 'Arabic';
    case 'fr': return 'French';
    case 'he': return 'Hebrew';
    case 'la': return 'Latin';
    case 'de': return 'German';
    case 'jrb': return 'Judeo-Arabic';
    default: return code;
  }

}
