import { Context, Database, Tables, Logger, $ } from 'koishi'
import { Dice, DiceGroup } from './index'

export class DiceDao {
    private readonly db: Database<Tables>
    private readonly logger: Logger
    constructor(ctx: Context) {
        this.db = ctx.database
        this.logger = ctx.logger('more-dice').extend('dice-dao')
        this.logger.debug('DiceDao initialized')
    }

    async addDice(dice: Dice): Promise<Dice | null> {
        return this.db.create('md-dices', dice)
            .then(result => result || null)
            .catch(e => {
                throw new Error(`Failed to add dice ${dice.name}: ${e.message}`)
            })
    }

    async getDiceById(id: number, userId: number): Promise<Dice | null> {
        return this.db
            .join(['md-dices', 'md-groups'], (dice, group) => $.eq(dice.groupId, group.id))
            .where(row => {
                return $.and(
                    $.eq(row['md-dices.id'], id),
                    $.eq(row['md-dices.deleted'], false),
                    $.eq(row['md-groups.deleted'], false),
                    $.or(
                        $.eq(row['md-groups.userId'], userId),
                        $.eq(row['md-groups.isPublic'], true)
                    )
                )
            })
            .execute()
            .then(result => result ? result[0]['md-dices'] : null)
            .catch(e => {
                throw new Error(`Failed to get dice by ID ${id}: ${e.message}`)
            })
    }

    async getMyDiceById(id: number, userId: number): Promise<Dice | null> {
        return this.db
            .join(['md-dices', 'md-groups'], (dice, group) => $.eq(dice.groupId, group.id))
            .where(row => {
                return $.and(
                    $.eq(row['md-dices.id'], id),
                    $.eq(row['md-dices.deleted'], false),
                    $.eq(row['md-groups.deleted'], false),
                    $.eq(row['md-groups.userId'], userId)
                )
            })
            .execute()
            .then(result => result ? result[0]['md-dices'] : null)
            .catch(e => {
                throw new Error(`Failed to get my dice by ID ${id}: ${e.message}`)
            })
    }

    async getDicesByName(name: string, userId: number, group?: DiceGroup): Promise<Dice[]> {
        return this.db.join(['md-dices', 'md-groups'], (dice, group) => {
            return $.eq(dice.groupId, group.id)
        }).where(row => {
            const conditions = [
                $.eq(row['md-dices.name'], name),
                $.eq(row['md-dices.deleted'], false),
                $.eq(row['md-groups.deleted'], false),
                $.or(
                    $.eq(row['md-groups.userId'], userId),
                    $.eq(row['md-groups.isPublic'], true)
                )
            ]
            if (group) {
                conditions.push($.eq(row['md-groups.id'], group.id))
            }
            return $.and(
                ...conditions
            )
        }).execute()
            .then(result => {
                return result.map(row => row['md-dices'])
            })
            .catch(e => {
                throw new Error(`Failed to get dices by name ${name}: ${e.message}`)
            })
    }

    async getMyDicesByName(name: string, userId: number, group?: DiceGroup): Promise<Dice[]> {
        return this.db
            .join(['md-dices', 'md-groups'], (dice, group) => $.eq(dice.groupId, group.id))
            .where(row => {
                const conditions = [
                    $.eq(row['md-dices.name'], name),
                    $.eq(row['md-dices.deleted'], false),
                    $.eq(row['md-groups.deleted'], false),
                    $.eq(row['md-groups.userId'], userId)
                ]
                if (group) {
                    conditions.push($.eq(row['md-groups.id'], group.id))
                }
                return $.and(
                    ...conditions
                )
            })
            .execute()
            .then(result => result.map(row => row['md-dices']))
            .catch(e => {
                throw new Error(`Failed to get my dices by name ${name}: ${e.message}`)
            })
    }

    async getDicesByGroupId(groupId: number, userId: number): Promise<Dice[]> {
        return this.db.join(['md-dices', 'md-groups'], (dice, group) => $.eq(dice.groupId, group.id))
            .where(row => {
                return $.and(
                    $.eq(row['md-dices.groupId'], groupId),
                    $.eq(row['md-dices.deleted'], false),
                    $.eq(row['md-groups.deleted'], false),
                    $.or(
                        $.eq(row['md-groups.userId'], userId),
                        $.eq(row['md-groups.isPublic'], true)
                    )
                )
            })
            .execute()
            .then(result => result.map(row => row['md-dices']))
            .catch(e => {
                throw new Error(`Failed to get dices by group ID ${groupId}: ${e.message}`)
            })
    }

    async deleteDice(dice: Dice): Promise<number> {
        return this.db.set('md-dices', { id: dice.id, deleted: false }, { deleted: true })
            .then(({ matched }) => matched)
            .catch(e => {
                throw new Error(`Failed to delete dice with ID ${dice.id}: ${e.message}`)
            })

    }

    async updateDice(dice: Dice): Promise<number> {
        return this.db.set('md-dices', { id: dice.id, deleted: false }, { name: dice.name, groupId: dice.groupId, faces: dice.faces })
            .then(({ matched }) => matched)
            .catch(e => {
                throw new Error(`Failed to update dice ${dice.name}: ${e.message}`)
            })
    }

    async addDiceBatch(dices: Dice[]): Promise<number> {
        if (dices.length === 0) return 0
        return this.db.upsert('md-dices', dices, ['name', 'groupId'])
            .then(({ inserted }) => inserted)
            .catch(e => {
                throw new Error(`Failed to add dice batch: ${e.message}`)
            })
    }
}