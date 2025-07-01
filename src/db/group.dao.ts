import { Context, Database, Query, Tables, $, Logger } from 'koishi'
import { Dice, DiceGroup } from './index'

export class GroupDao {
    private readonly db: Database<Tables>
    private readonly logger: Logger
    constructor(ctx: Context) {
        this.db = ctx.database
        this.logger = ctx.logger('more-dice').extend('group-dao')
        this.logger.debug('GroupDao initialized')
    }

    async addGroup(group: DiceGroup): Promise<DiceGroup | null> {
        return this.db.create('md-groups', group)
            .then(result => result || null)
            .catch(e => {
                throw new Error(`Failed to add group ${group.name}: ${e.message}`)
            })
    }

    async getGroupsByName(name: string, userId: number): Promise<DiceGroup[]> {
        return this.db.select('md-groups')
            .where(row => {
                return $.and(
                    $.eq(row.name, name),
                    $.eq(row.deleted, false),
                    $.or(
                        $.eq(row.userId, userId),
                        $.eq(row.isPublic, true)
                    )
                )
            })
            .execute()
            .then(result => result || [])
            .catch(e => {
                throw new Error(`Failed to get groups by name ${name}: ${e.message}`)
            })
    }

    async getGroupById(id: number, userId: number): Promise<DiceGroup | null> {
        return this.db.select('md-groups')
            .where(row => {
                return $.and(
                    $.eq(row.id, id),
                    $.eq(row.deleted, false),
                    $.or(
                        $.eq(row.userId, userId),
                        $.eq(row.isPublic, true)
                    )
                )
            })
            .execute()
            .then(result => result ? result[0] : null)
            .catch(e => {
                throw new Error(`Failed to get group by ID ${id}: ${e.message}`)
            })
    }

    async getMyGroupsByName(name: string, userId: number): Promise<DiceGroup[]> {
        return this.db.get('md-groups', { name, userId, deleted: false })
            .then(result => {
                return result || []
            })
            .catch(e => {
                throw new Error(`Failed to get my groups by name ${name}: ${e.message}`)
            })
    }

    async getMyGroupById(id: number, userId: number): Promise<DiceGroup | null> {
        return this.db.get('md-groups', { id, userId, deleted: false })
            .then(result => result ? result[0] : null)
            .catch(e => {
                throw new Error(`Failed to get my group by ID ${id}: ${e.message}`)
            })
    }

    async updateGroup(group: DiceGroup): Promise<number> {
        return this.db.set('md-groups', { id: group.id, deleted: false }, { name: group.name, isPublic: group.isPublic, userId: group.userId })
            .then(({ matched }) => {
                return matched
            })
            .catch((e) => {
                throw new Error(`Failed to update group with ID ${group.id}: ${e.message}`)
            })
    }

    async deleteGroup(group: DiceGroup): Promise<number> {
        return this.db.set('md-groups', { id: group.id, deleted: false }, { deleted: true })
            .then(({ matched }) => matched)
            .catch(e => {
                throw new Error(`Failed to delete group with ID ${group.id}: ${e.message}`)
            })
    }
}