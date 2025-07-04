import { Context } from 'koishi'

export * from './group.dao'
export * from './dice.dao'

declare module 'koishi' {
    interface Tables {
        "md-dices": Dice,
        "md-groups": DiceGroup,
        "md-tokens": Token
    }
}

export interface Token {
    id: number
    userId: number
    token: string
    createdAt: Date
    updatedAt: Date
    expiresAt: Date
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
    ctx.model.extend('md-tokens', {
        id: 'unsigned',
        userId: 'unsigned',
        token: 'string',
        createdAt: 'timestamp',
        updatedAt: 'timestamp',
        expiresAt: 'timestamp',
    }, {
        primary: 'id',
        autoInc: true,
    })
}

export async function databaseReset(ctx: Context): Promise<boolean> {
    try {
        await ctx.model.drop('md-dices')
        await ctx.model.drop('md-groups')
        await ctx.model.drop('md-tokens')
        databaseInit(ctx)
        return true
    } catch (error) {
        ctx.logger('more-dice').error('Failed to reset database:', error)
        return false
    }
}