class BaseError implements Error {
    public name: string

    constructor(public message: string, public array: string[] = []) {
        this.name = this.convertToKebabCase(this.constructor.name)
    }
    private convertToKebabCase(className: string): string {
        return 'error.' + className
            .replace(/[A-Z]/g, (match, offset) =>
                offset > 0 ? '-' + match : match
            )
            .toLowerCase()
    }
}

export class GroupNameExists extends BaseError {
    constructor(groupName: string) {
        super(`Group with name "${groupName}" already exists.`, [groupName])
    }
}

export class GroupNameNotFound extends BaseError {
    constructor(groupName: string) {
        super(`Group with name "${groupName}" not found.`, [groupName])
    }
}

export class GroupIdNotFound extends BaseError {
    constructor(groupId: number) {
        super(`Group with ID ${groupId} not found.`, [groupId.toString()])
    }
}

export class GroupNameNotUnique extends BaseError {
    constructor(groupName: string) {
        super(
            `Multiple groups found with name "${groupName}". Cannot identify a single group.`,
            [groupName]
        )
    }
}

export class GroupNameInvalid extends BaseError {
    constructor(groupName: string, tip: string) {
        super(`Group name "${groupName}" is invalid.`, [groupName, tip])
    }
}

export class GroupUnitialized extends BaseError {
    constructor(userId: number) {
        super(`User with Id ${userId} has not initialized a group.`, [userId.toString()])
    }
}

export class GroupItialized extends BaseError {
    constructor(userId: number) {
        super(`User with Id ${userId} has already initialized a group.`, [userId.toString()])
    }
}

export class DiceNameExists extends BaseError {
    constructor(diceName: string) {
        super(`Dice with name "${diceName}" already exists.`, [diceName])
    }
}
export class DiceNameNotFound extends BaseError {
    constructor(diceName: string) {
        super(`Dice with name "${diceName}" not found.`, [diceName])
    }
}

export class DiceIdNotFound extends BaseError {
    constructor(diceId: number) {
        super(`Dice with ID ${diceId} not found.`, [diceId.toString()])
    }
}

export class DiceNameNotUnique extends BaseError {
    constructor(diceName: string) {
        super(
            `Multiple dices found with name "${diceName}". Cannot identify a single dice.`,
            [diceName]
        )
    }
}

export class DiceNameInvalid extends BaseError {
    constructor(diceName: string, tip: string) {
        super(`Dice name "${diceName}" is invalid.`, [diceName, tip])
    }
}

export class FaceMissingError extends BaseError {
    constructor(property: string) {
        super(`Face property ${property} is missing in the dice face data.`, [property])
    }
}

export class JsonPathError extends BaseError {
    constructor(jsonPath: string) {
        super(`JSONPath "${jsonPath}" parsing failed. Please check if your JSONPath expression is correct.`, [jsonPath])
    }
}

export class JsonParseError extends BaseError {
    constructor(data: string) {
        super(`JSON parsing failed for data: "${data}". Please check if your JSON data format is correct.`, [data])
    }
}

export class FaceInvalid extends BaseError {
    constructor(face: string) {
        super(`Dice face "${face}" is invalid.`, [face])
    }
}

export class GroupCloneFailed extends BaseError {
    constructor(groupName: string) {
        super(`Failed to clone dice group "${groupName}".`, [groupName])
    }
}

export class RollTimesInvalid extends BaseError {
    constructor(times: number) {
        super(`Roll times "${times}" is invalid. It must be a positive integer.`, [times.toString()])
    }
}