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

export function databaseReset(ctx: Context): Promise<boolean> {
    return new Promise((resolve, reject) => {
        ctx.model.drop('md-dices')
            .then(() => ctx.model.drop('md-groups'))
            .then(() => {
                databaseInit(ctx)
                resolve(true)
            })
            .catch(error => {
                ctx.logger('more-dice').extend('db').error('Failed to reset database:', error.message)
                reject(error)
            })
    })
}