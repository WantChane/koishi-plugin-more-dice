import { Context, Logger } from 'koishi'
import { DiceGroup } from "../db"
import { DiceDao } from '../db/dice.dao'
import { GroupDao } from "../db/group.dao"
import { GroupCloneFailed, GroupIdNotFound, GroupItialized, GroupNameExists, GroupNameInvalid, GroupNameNotFound, GroupNameNotUnique } from '../error'
import { parseToNum } from '../utils'
export class GroupService {
    private readonly logger: Logger
    private readonly groupNameFormat: string
    private readonly groupNameTip: string
    constructor(
        private groupDao: GroupDao,
        private diceDao: DiceDao,
        ctx: Context
    ) {
        this.logger = ctx.logger('more-dice').extend('group-service')
        this.logger.debug('GroupService initialized')
        this.groupNameFormat = ctx.config.GroupNameFormat || '^[a-zA-Z][a-zA-Z0-9]{0,19}$'
        this.groupNameTip = ctx.config.GroupNameTip || '骰子组名称必须以字母开头，且长度不超过20个字符。只能包含字母和数字。'

    }

    #validateGroupName(name: string, regex: string = this.groupNameFormat): boolean {
        const pattern = new RegExp(regex)
        return pattern.test(name)
    }

    async getMyGroup(input: string, userId: number): Promise<DiceGroup | null> {
        const parsedInput = parseToNum(input)
        if (typeof parsedInput === 'number') {
            const group = await this.groupDao.getMyGroupById(parsedInput, userId)
            if (group) {
                return group
            } else {
                throw new GroupIdNotFound(parsedInput)
            }
        } else {
            const groups = await this.groupDao.getMyGroupsByName(parsedInput, userId)
            if (groups && groups.length === 1) {
                return groups[0]
            } else if (groups.length > 1) {
                throw new GroupNameNotUnique(parsedInput)
            } else {
                throw new GroupNameNotFound(parsedInput)
            }
        }
    }

    async getGroup(input: string, userId: number): Promise<DiceGroup | null> {
        const parsedInput = parseToNum(input)
        if (typeof parsedInput === 'number') {
            const group = await this.groupDao.getGroupById(parsedInput, userId)
            if (group) {
                return group
            } else {
                throw new GroupIdNotFound(parsedInput)
            }
        } else {
            const groups = await this.groupDao.getGroupsByName(parsedInput, userId)
            if (groups && groups.length === 1) {
                return groups[0]
            } else if (groups.length > 1) {
                throw new GroupNameNotUnique(parsedInput)
            } else {
                throw new GroupNameNotFound(parsedInput)
            }
        }
    }

    async addGroup(name: string, userId: number): Promise<DiceGroup> {
        if (!this.#validateGroupName(name)) {
            throw new GroupNameInvalid(name, this.groupNameTip)
        }
        const group: DiceGroup = {
            name,
            userId,
            isPublic: false,
            deleted: false
        }
        const existingGroups = await this.groupDao.getMyGroupsByName(name, userId)
        if (existingGroups && existingGroups.length > 0) {
            throw new GroupNameExists(name)
        }
        return this.groupDao.addGroup(group)
            .then(result => result ? result : null)
            .catch(() => null)
    }

    async initGroup(userId: number): Promise<DiceGroup> {
        const groupName = `group${userId}`
        const existingGroups = await this.groupDao.getMyGroupsByName(groupName, userId)
        if (existingGroups && existingGroups.length > 0) {
            throw new GroupItialized(userId)
        }
        const group: DiceGroup = {
            name: groupName,
            userId,
            isPublic: false,
            deleted: false
        }
        return this.groupDao.addGroup(group)
            .then(result => result ? result : null)
            .catch(() => null)
    }

    async renameGroup(input: string, userId: number, newName: string): Promise<number> {
        if (!this.#validateGroupName(newName)) {
            throw new GroupNameInvalid(newName, this.groupNameTip)
        }
        const group = await this.getMyGroup(input, userId)
        if (!group) return -1
        group.name = newName
        const existingGroups = await this.groupDao.getMyGroupsByName(newName, userId)
        if (existingGroups && existingGroups.length > 0) {
            throw new GroupNameExists(newName)
        }
        return this.groupDao.updateGroup(group)
            .then(result => result)
            .catch(() => -1)
    }

    async deleteGroup(input: string, userId: number): Promise<number> {
        const group = await this.getMyGroup(input, userId)
        return this.groupDao.deleteGroup(group)
            .then(result => result)
            .catch(() => -1)
    }

    async cloneGroup(input: string, userId: number, newName?: string): Promise<DiceGroup> {
        const group = await this.getGroup(input, userId)
        const newGroup = await this.addGroup(group.name, userId)
        const dices = await this.diceDao.getDicesByGroupId(group.id, userId)
        const cleanedDices = dices.map(dice => {
            return {
                ...dice,
                id: undefined,
                groupId: newGroup.id,
                deleted: false
            }
        })
        await this.diceDao.addDiceBatch(cleanedDices)
            .catch(e => {
                throw new GroupCloneFailed(group.name)
            })
        return newGroup
    }

    async setGroupPublic(input: string, userId: number, isPublic: boolean): Promise<number> {
        const group = await this.getMyGroup(input, userId)
        group.isPublic = isPublic
        return this.groupDao.updateGroup(group)
            .then(result => result)
            .catch(() => -1)
    }
}