export function parseToNum(input: string): number | string {
    const numericValue = Number(input);
    if (
        !isNaN(numericValue) &&
        Number.isInteger(numericValue) &&
        numericValue >= 0
    ) {
        return numericValue;
    }
    return input;
}