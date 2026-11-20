export function label(value: string) {
    return value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
}

export function date(value: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
