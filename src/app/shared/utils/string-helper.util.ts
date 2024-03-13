export function getRandomId(): string {
    return `${Math.ceil(Math.random() * 8000)}`;
}

export function searchString(str: string, searchString: string): boolean {
    str = str ?? '';
    searchString = searchString ?? '';
    return str.trim().toLowerCase().includes(searchString.trim().toLowerCase());
}