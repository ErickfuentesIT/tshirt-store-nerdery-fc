 export function calculateExpiryDate(ttl: string): Date {
    const numeric = parseInt(ttl);
    const unit = ttl.slice(-1);
    const now = new Date();

    if (unit === 'd') now.setDate(now.getDate() + numeric);
    else if (unit === 'h') now.setHours(now.getHours() + numeric);
    else if (unit === 'm') now.setMinutes(now.getMinutes() + numeric);
    else if (unit === 's') now.setSeconds(now.getSeconds() + numeric);
    else now.setDate(now.getDate() + 7); // Default fallback

    return now;
  }