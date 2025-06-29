import { Context } from 'koishi'


declare module 'koishi' {
    interface Tables {
        "md-dices": Dice,
        "md-dice-groups": DiceGroup,
    }
}

export interface Dice {
    id: number
    name: string
    faces: string[]
    groupId: number
    deleted: boolean
}

export interface DiceGroup {
    id: number
    name: string
    userId: number
    isPublic: boolean
    deleted: boolean
}

export function databaseInit(ctx: Context) {
    ctx.model.extend('md-dices', {
        id: 'unsigned',
        name: 'string',
        faces: 'list',
        groupId: 'unsigned',
        deleted: 'boolean',
    }, {
        primary: 'id',
        autoInc: true,
    })

    ctx.model.extend('md-dice-groups', {
        id: 'unsigned',
        name: 'string',
        userId: 'unsigned',
        isPublic: 'boolean',
        deleted: 'boolean',
    }, {
        primary: "id",
        autoInc: true,
    })
}