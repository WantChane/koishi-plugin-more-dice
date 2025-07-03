import { JSONPath } from 'jsonpath-plus'
import { Context, Logger } from 'koishi'
import { Dice, DiceGroup, Face } from "../db"
import { DiceDao } from '../db/dice.dao'
import { DiceIdNotFound, DiceNameExists, DiceNameInvalid, DiceNameNotFound, DiceNameNotUnique, FaceInvalid, FaceMissingError, GroupNameNotFound, GroupUnitialized, JsonParseError, JsonPathError, RollTimesInvalid } from '../error'
import { parseToNum } from "../utils"
import { GroupService } from "./group.service"

export class DiceService {
    private readonly logger: Logger
    private readonly diceNameFormat: string
    private readonly diceNameTip: string
    private readonly http: any
    private readonly rollResultSeparator: string
    constructor(
        private diceDao: DiceDao,
        private groupService: GroupService,
        ctx: Context
    ) {
        this.logger = ctx.logger('more-dice').extend('dice-service')
        this.logger.debug('DiceService initialized')
        this.diceNameFormat = ctx.config.DiceNameFormat || '^[a-zA-Z][a-zA-Z0-9]{0,19}$'
        this.diceNameTip = ctx.config.DiceNameTip || '骰子组名称必须以字母开头，且长度不超过20个字符。只能包含字母和数字。'
        this.http = ctx.http
        this.rollResultSeparator = ctx.config.RollResultSeparator || '-'
    }

    #validateInput(name: string, regex: string = this.diceNameFormat): boolean {
        const pattern = new RegExp(regex)
        return pattern.test(name)
    }

    #rollDice(dice: Dice): string {
        if (!dice.faces || dice.faces.length === 0) return ''
        const result: string[] = []
        let currentLayer: Face[] = dice.faces
        while (currentLayer.length > 0) {
            const totalWeight = currentLayer.reduce((sum, face) => sum + (face.weight ?? 1), 0)
            let random = Math.random() * totalWeight
            let selectedFace: Face | null = null
            for (const face of currentLayer) {
                random -= face.weight ?? 1
                if (random <= 0) {
                    selectedFace = face
                    break
                }
            }
            if (selectedFace) {
                if (selectedFace.visible !== false) {
                    result.push(selectedFace.face)
                }
                currentLayer = selectedFace.subfaces ?? []
            } else {
                break
            }
        }
        return result.join(this.rollResultSeparator)
    }

    async #parseFacesInput(input: string, option: {
        object: boolean
        jsonpath?: string
    }): Promise<Face[]> {
        const processedData = await this.#handleProtocol(input)
        let arrayData: any[]
        if (typeof processedData !== 'string' && typeof processedData !== 'object') {
            throw new FaceInvalid(processedData)
        }
        if (option.jsonpath) {
            let jsonOjbect: any = {}
            if (typeof processedData === 'string') {
                try {
                    jsonOjbect = JSON.parse(processedData)
                } catch (e) {
                    throw new JsonParseError(processedData)
                }
            } else if (typeof processedData === 'object') {
                jsonOjbect = processedData
            }
            const result = JSONPath({
                json: jsonOjbect,
                path: option.jsonpath
            })
            if (!Array.isArray(result)) {
                throw new JsonPathError(option.jsonpath)
            }
            arrayData = result
        } else {
            if (typeof processedData === 'string') {
                arrayData = processedData.split(',').map(s => s.trim())
            } else {
                throw new FaceInvalid(processedData)
            }
        }
        if (option.object) {
            return this.#normalizeFaces(arrayData)
        } else {
            return arrayData.map(text => ({
                face: text.trim(),
                weight: 1,
                visible: true,
                subfaces: []
            } as Face)
            )
        }
    }

    async #handleProtocol(input: string): Promise<any> {
        if (input.startsWith('base64://')) {
            const base64Data = input.substring(9)
            return Buffer.from(base64Data, 'base64').toString('utf-8')
        } else if (input.startsWith('http://') || input.startsWith('https://')) {
            return this.http.get(input, {
                headers: { Accept: 'application/json' },
                responseType: 'json'
            })
        }
        return input
    }

    #normalizeFaces(input: any[]): Face[] {
        return input.map(item => {
            if (typeof item !== 'object' || !item.face) {
                throw new FaceMissingError(item)
            }
            const cleanItem: Partial<Face> = {
                face: item.face,
                visible: typeof item.visible === 'boolean' ? item.visible : true,
                weight: typeof item.weight === 'number' ? item.weight : 1,
                subfaces: Array.isArray(item.subfaces)
                    ? this.#normalizeFaces(item.subfaces)
                    : []
            }
            return cleanItem as Face
        })
    }

    #parseDiceInput(input: string): { groupInput: string, diceInput: string } | null {
        const parts = input.split(':')
        if (parts.length === 1) {
            return { groupInput: undefined, diceInput: parts[0] }
        } else if (parts.length === 2) {
            return { groupInput: parts[0], diceInput: parts[1] }
        } else {
            return null
        }
    }

    async addDice(name: string, userId: number, faces: string, options): Promise<Dice | null> {
        if (!this.#validateInput(name)) {
            throw new DiceNameInvalid(name, this.diceNameTip)
        }
        const groupName = options.group || `group${userId}`
        const groupData = await this.groupService.getMyGroup(groupName, userId)
            .catch((e) => {
                if (e instanceof GroupNameNotFound && e.array[0] === `group${userId}`) {
                    throw new GroupUnitialized(userId)
                } else {
                    throw e
                }
            })
        const existingDices = await this.diceDao.getDicesByName(name, userId, groupData)
        if (existingDices && existingDices.length > 0) {
            throw new DiceNameExists(name)
        }
        const dice: Dice = {
            name,
            groupId: groupData.id,
            faces: await this.#parseFacesInput(faces, options),
            deleted: false,
        }
        return this.diceDao.addDice(dice)
            .then(result => {
                return result ? result : null
            })
            .catch(() => null)
    }

    async getMyDice(input: string, userId: number): Promise<Dice | null> {
        const parsedInput = this.#parseDiceInput(input)
        let group: DiceGroup
        if (!parsedInput) {
            throw new Error(`Invalid dice input format: ${input}`)
        } else if (parsedInput.groupInput) {
            group = await this.groupService.getMyGroup(parsedInput.groupInput, userId)
        }
        const diceInput = parseToNum(parsedInput.diceInput)

        if (typeof diceInput === 'number') {
            const dice = await this.diceDao.getMyDiceById(diceInput, userId)
            if (dice) {
                return dice
            } else {
                throw new DiceIdNotFound(diceInput)
            }
        } else {
            const dices = await this.diceDao.getMyDicesByName(diceInput, userId, group)
            if (dices && dices.length === 1) {
                return dices[0]
            } else if (dices.length > 1) {
                throw new DiceNameNotUnique(diceInput)
            } else {
                throw new DiceNameNotFound(diceInput)
            }
        }
    }

    async rollDice(input: string, userId: number, times: number = 1): Promise<string[]> {
        const dice = await this.getMyDice(input, userId)
        if (times <= 0 || !Number.isInteger(times)) {
            throw new RollTimesInvalid(times)
        }
        const results: string[] = []
        for (let i = 0; i < times; i++) {
            const result = this.#rollDice(dice)
            results.push(result)
        }
        return results
    }

    async deleteDice(input: string, userId: number): Promise<number> {
        const dice = await this.getMyDice(input, userId)
        return this.diceDao.deleteDice(dice)
            .then(result => result > 0 ? result : -1)
            .catch(() => -1)
    }

    async setDiceFaces(input: string, userId: number, faces: string, options): Promise<number> {
        const dice = await this.getMyDice(input, userId)
        dice.faces = await this.#parseFacesInput(faces, options)
        return this.diceDao.updateDice(dice)
            .then(result => result > 0 ? result : -1)
            .catch(() => -1)
    }

    async renameDice(input: string, userId: number, newName: string): Promise<number> {
        const dice = await this.getMyDice(input, userId)
        if (!this.#validateInput(newName)) {
            throw new DiceNameInvalid(newName, this.diceNameTip)
        }
        if (dice.name === newName) {
            return 0
        }
        const existingDices = await this.diceDao.getDicesByName(newName, userId, { id: dice.groupId })
        if (existingDices && existingDices.length > 0) {
            throw new DiceNameExists(newName)
        }
        dice.name = newName
        return this.diceDao.updateDice(dice)
            .then(result => result > 0 ? result : -1)
            .catch(() => -1)
    }
}
