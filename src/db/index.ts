import { Context } from 'koishi'

export * from './group.dao'
export * from './dice.dao'

declare module 'koishi' {
    interface Tables {
        "md-dices": Dice,
        "md-groups": DiceGroup,
    }
}

export interface Face {
    face: string
    visible?: boolean
    subfaces?: Face[]
    weight?: number
}

export interface Dice {
    id?: number
    name?: string
    faces?: Face[]
    groupId?: number
    deleted?: boolean
}

export interface DiceGroup {
    id?: number
    name?: string
    userId?: number
    isPublic?: boolean
    deleted?: boolean
}

export function databaseInit(ctx: Context) {
    if (process.env.NODE_ENV === 'development') {
        ctx.logger('more-dice').extend('db').warn('[development] Drop table md-dices')
        ctx.model.drop('md-dices')
    }
    ctx.model.extend('md-dices', {
        id: 'unsigned',
        name: 'string',
        faces: 'json',
        groupId: 'unsigned',
        deleted: {
            type: 'boolean',
            initial: false,
            nullable: false
        }
    }, {
        primary: 'id',
        autoInc: true,
    })

    if (process.env.NODE_ENV === 'development') {
        ctx.logger('more-dice').extend('db').warn('[development] Drop table md-groups')
        ctx.model.drop('md-groups')
    }
    ctx.model.extend('md-groups', {
        id: 'unsigned',
        name: 'string',
        userId: 'unsigned',
        isPublic: {
            type: 'boolean',
            initial: false,
            nullable: false
        },
        deleted: {
            type: 'boolean',
            initial: false,
            nullable: false
        }
    }, {
        primary: "id",
        autoInc: true,
    })
}