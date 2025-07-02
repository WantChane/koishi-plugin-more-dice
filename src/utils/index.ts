export function parseToNum(input: string): number | string {
    const numericValue = Number(input)
    if (
        !isNaN(numericValue) &&
        Number.isInteger(numericValue) &&
        numericValue >= 0
    ) {
        return numericValue
    }
    return input
}

export function formatString(template: string, object: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        return object.hasOwnProperty(key) ? String(object[key]) : `{${key}}`
    })
}