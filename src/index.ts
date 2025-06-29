import { Context, Schema, $ } from 'koishi'

export const name = 'more-dice'

export interface Config { }

export const inject = {
  required: ['database'],
  optional: ['bind'],
}

declare module 'koishi' {
  interface Tables {
    "md-dices": Dice,
    "md-dice-groups": DiceGroup,
  }
}

// 骰子数据结构
export interface Dice {
  id: number
  name: string
  faces: string[]
  groupId: number
  deleted: boolean
}

// 骰子组数据结构
export interface DiceGroup {
  id: number
  name: string
  userId: number
  isPublic: boolean
  deleted: boolean
}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.i18n.define('zh-CN', require('./locale/zh-CN.yml'))
  // ==============================
  // 新增：验证名字合法性的函数
  // ==============================
  /**
   * 验证名称是否合法（20个字符以内的英文或数字，必须以字母开头）
   * @param name 要验证的名称
   * @returns 是否合法
   */
  function validateName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9]{2,19}$/.test(name)
  }
  ctx.model.drop('md-dices')
  // 扩展数据库表 - 添加逻辑删除字段
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

  ctx.model.drop('md-dice-groups')
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

  // ==============================
  // 核心公共函数
  // ==============================

  /**
   * 解析骰子标识符 (ID 或 [group]:name 格式)
   * @param userId 当前用户ID
   * @param diceIdentifier 骰子标识符
   * @returns 骰子对象
   */
  async function parseDiceIdentifier(userId: number, diceIdentifier: string): Promise<Dice> {
    // 1. 如果是纯数字，按ID查询
    if (/^\d+$/.test(diceIdentifier)) {
      const dice = await ctx.database.get('md-dices',
        { id: +diceIdentifier, deleted: false }
      )
      if (dice.length && await validateGroupOwnership(userId, dice[0].groupId)) {
        return dice[0]
      }
      return null
    }

    // 2. 解析 [group]:name 格式（组名可选）
    const match = diceIdentifier.match(/^(?:([a-zA-Z][a-zA-Z0-9]*):)?([a-zA-Z][a-zA-Z0-9]+)$/)
    if (match) {
      const [, groupName, diceName] = match

      // 如果有提供组名
      if (groupName) {
        const group = await ctx.database.get('md-dice-groups',
          { name: groupName, userId, deleted: false }
        )
        if (!group.length) return null

        const dice = await ctx.database.get('md-dices',
          { name: diceName, groupId: group[0].id, deleted: false }
        )
        return dice.length ? dice[0] : null
      }
      // 如果没有提供组名，则搜索用户所有组
      else {
        const dice = await ctx.database.get('md-dices', {
          name: diceName,
          deleted: false,
          groupId: {
            $in: (await ctx.database.get('md-dice-groups',
              { userId, deleted: false }
            )).map(g => g.id)
          }
        })

        return dice.length === 1 ? dice[0] : null
      }
    }

    return null
  }

  /**
   * 验证用户是否拥有指定骰子组
   * @param userId 用户ID
   * @param groupId 骰子组ID
   * @returns 是否拥有权限
   */
  async function validateGroupOwnership(userId: number, groupId: number): Promise<boolean> {
    const group = await ctx.database.get('md-dice-groups',
      { id: groupId, userId, deleted: false }
    )
    return group.length > 0
  }

  /**
   * 解析骰子面字符串 (支持逗号分隔或base64编码)
   * @param input 输入字符串
   * @returns 面数组
   */
  function parseFaces(input: string): string[] {
    try {
      // 尝试base64解码
      if (input.startsWith('base64:')) {
        const base64String = input.slice(7)
        const decoded = Buffer.from(base64String, 'base64').toString('utf-8')
        return decoded.split(',')
      }
    } catch {
      // 解码失败则继续尝试逗号分割
    }
    return input.split(',')
  }

  // ==============================
  // 初始化命令
  // ==============================
  ctx.command('md.init')
    .userFields(['id'])
    .action(async ({ session }) => {
      const userId = session.user.id

      const existing = await ctx.database.get('md-dice-groups',
        { userId, name: `group${userId}`, deleted: false }
      )
      if (existing.length) return session.text('.fail')

      await ctx.database.create('md-dice-groups', {
        name: `group${userId}`,
        userId,
        isPublic: false,
        deleted: false
      })
      return session.text('.success')
    })

  // ==============================
  // 组管理命令
  // ==============================
  const groupCmd = ctx.command('md.group')

  // 创建组
  groupCmd.subcommand('.create <name:string>')
    .userFields(['id'])
    .action(async ({ session }, name) => {
      const userId = session.user.id

      // 使用验证函数验证组名格式
      if (!validateName(name)) {
        return session.text('.invalid-group-name')
      }

      // 检查组名是否已存在
      const existing = await ctx.database.get('md-dice-groups',
        { name, userId, deleted: false }
      )
      if (existing.length) return session.text('.duplicate-group-name')

      // 创建新组
      await ctx.database.create('md-dice-groups', {
        name,
        userId,
        isPublic: false,
        deleted: false
      })

      return session.text('.success', [name])
    })

  // 设置组公开状态
  groupCmd.subcommand('.setpublic <name:string> <state:number>')
    .userFields(['id'])
    .action(async ({ session }, name, state) => {
      const userId = session.user.id
      const state_boolean = !!state
      const groups = await ctx.database.get('md-dice-groups',
        { name, userId, deleted: false }
      )
      if (!groups.length) return session.text('.group-not-found')

      await ctx.database.set('md-dice-groups', { id: groups[0].id, name }, { isPublic: state_boolean })
      return state_boolean ? session.text('.success-public', [name]) : session.text('.success-private', [name])
    })

  // 克隆组
  groupCmd.subcommand('.clone <source:string> [target:string]')
    .userFields(['id'])
    .action(async ({ session }, source, target) => {
      const userId = session.user.id

      // 查找源组
      let sourceGroup: DiceGroup
      if (/^\d+$/.test(source)) {
        // 按ID查找
        sourceGroup = (await ctx.database.get('md-dice-groups',
          { id: +source, isPublic: true, deleted: false }
        ))[0]
      } else {
        // 按名称查找（只查询公开组）
        const groups = await ctx.database.get('md-dice-groups',
          { name: source, isPublic: true, deleted: false }
        )
        if (groups.length > 1) return session.text('.duplicate-group-name')
        sourceGroup = groups[0]
      }

      if (!sourceGroup) return session.text('.group-not-found', [source])

      // 确定目标组名
      target = target || `${sourceGroup.name}`

      // 使用验证函数验证组名格式
      if (!validateName(target)) {
        return session.text('.invalid-group-name')
      }

      const nameExists = await ctx.database.get('md-dice-groups',
        { name: target, userId, deleted: false }
      )
      if (nameExists.length) return session.text('.group-name-exists')

      // 创建新组
      const newGroup = await ctx.database.create('md-dice-groups', {
        name: target,
        userId,
        isPublic: false,
        deleted: false
      })

      // 克隆骰子
      const dices = await ctx.database.get('md-dices',
        { groupId: sourceGroup.id, deleted: false }
      )
      for (const dice of dices) {
        await ctx.database.create('md-dices', {
          name: dice.name,
          faces: dice.faces,
          groupId: newGroup.id,
          deleted: false
        })
      }

      return session.text('.success', [sourceGroup.name, newGroup.name])
    })

  // 重命名组
  groupCmd.subcommand('.rename <oldName:string> <newName:string>')
    .userFields(['id'])
    .action(async ({ session }, oldName, newName) => {
      const userId = session.user.id

      // 使用验证函数验证新组名格式
      if (!validateName(newName)) {
        return session.text('.invalid-group-name')
      }

      const groups = await ctx.database.get('md-dice-groups',
        { name: oldName, userId, deleted: false }
      )
      if (!groups.length) return session.text('.group-not-found')

      // 检查新名称是否已存在
      const nameExists = await ctx.database.get('md-dice-groups',
        { name: newName, userId, deleted: false }
      )
      if (nameExists.length) return session.text('.duplicate-group-name')

      await ctx.database.set('md-dice-groups', groups[0].id, { name: newName })

      return session.text('.success', [oldName, newName])
    })

  // 搜索组
  groupCmd.subcommand('.search <name:string>')
    .action(async ({ session }, name) => {
      const groups = await ctx.database.select('md-dice-groups')
        .where({
          name: { $regex: new RegExp(name, 'i') },
          isPublic: true,
          deleted: false
        })
        .limit(10)
        .execute()

      if (!groups.length) return session.text('.group-not-found')

      return session.text('.results', [groups.map(g =>
        session.text('.group-info', [g.name, g.id])
      ).join('\n')])


    })

  // 删除组（逻辑删除）
  groupCmd.subcommand('.delete <name:string>')
    .userFields(['id'])
    .action(async ({ session }, name) => {
      const userId = session.user.id

      const groups = await ctx.database.get('md-dice-groups',
        { name, userId, deleted: false }
      )
      if (!groups.length) return session.text('.group-not-found')

      // 逻辑删除组
      await ctx.database.set('md-dice-groups', groups[0].id, { deleted: true })

      // 逻辑删除组内所有骰子
      await ctx.database.set('md-dices',
        { groupId: groups[0].id },
        { deleted: true }
      )

      return session.text('.success', [name])
    })

  // ==============================
  // 骰子管理命令
  // ==============================
  const diceCmd = ctx.command('md.dice')

  // 创建骰子
  diceCmd.subcommand('.create <name:string> <faces:string>')
    .option('group', '-g <group:string>', { fallback: '' })
    .userFields(['id'])
    .action(async ({ session, options }, name, faces) => {
      const userId = session.user.id
      const groupName = options.group || `group${userId}`

      // 使用验证函数验证骰子名格式
      if (!validateName(name)) {
        return session.text('.invalid-dice-name')
      }

      // 查找目标组
      const groups = await ctx.database.get('md-dice-groups',
        { name: groupName, userId, deleted: false }
      )
      if (!groups.length) return session.text('.group-not-found', [groupName])

      // 解析骰子面
      const facesArray = parseFaces(faces)
      if (!facesArray.length) return session.text('invalid-faces')

      // 检查同名骰子
      const existing = await ctx.database.get('md-dices',
        { name, groupId: groups[0].id, deleted: false }
      )
      if (existing.length) return session.text('.duplicate-dice-name')

      // 创建骰子
      await ctx.database.create('md-dices', {
        name,
        faces: facesArray,
        groupId: groups[0].id,
        deleted: false
      })

      return session.text('.success', [name])
    })

  // 删除骰子
  diceCmd.subcommand('.delete <dice:string>')
    .userFields(['id'])
    .action(async ({ session }, dice) => {
      const userId = session.user.id
      const diceObj = await parseDiceIdentifier(userId, dice)
      if (!diceObj) return session.text('.dice-not-found')

      await ctx.database.set('md-dices', diceObj.id, { deleted: true })
      return session.text('.success', [diceObj.name])
    })

  // 重命名骰子
  diceCmd.subcommand('.rename <dice:string> <newName:string>')
    .userFields(['id'])
    .action(async ({ session }, dice, newName) => {
      const userId = session.user.id
      const diceObj = await parseDiceIdentifier(userId, dice)
      if (!diceObj) return session.text('.dice-not-found')

      // 使用验证函数验证新骰子名格式
      if (!validateName(newName)) {
        return session.text('.invalid-dice-name')
      }

      // 检查新名称是否冲突
      const existing = await ctx.database.get('md-dices',
        { name: newName, groupId: diceObj.groupId, deleted: false }
      )
      if (existing.length) return session.text('.duplicate-dice-name')

      await ctx.database.set('md-dices', diceObj.id, { name: newName })
      return session.text('.success', [diceObj.name, newName])
    })

  // 修改骰子面
  diceCmd.subcommand('.set <dice:string> <faces:string>', '修改骰子面')
    .userFields(['id'])
    .action(async ({ session }, dice, faces) => {
      const userId = session.user.id
      const diceObj = await parseDiceIdentifier(userId, dice)
      if (!diceObj) return session.text('.dice-not-found')

      const facesArray = parseFaces(faces)
      if (!facesArray.length) return session.text('.invalid-faces')

      await ctx.database.set('md-dices', diceObj.id, { faces: facesArray })
      return session.text('.success', [diceObj.name])
    })

  // ==============================
  // 核心功能：掷骰命令
  // ==============================
  ctx.command('md.roll <dice:string>')
    .userFields(['id'])
    .action(async ({ session }, dice) => {
      const userId = session.user.id
      const diceObj = await parseDiceIdentifier(userId, dice)
      if (!diceObj) return session.text('.dice-not-found')

      // 随机选择一面
      const result = diceObj.faces[Math.floor(Math.random() * diceObj.faces.length)]
      return session.text('.success', [result])
    })

  // ==============================
  // 辅助命令：用户信息展示
  // ==============================
  ctx.command('md.info')
    .userFields(['id'])
    .action(async ({ session }) => {
      const userId = session.user.id

      // 获取用户的所有组
      const groups = await ctx.database.get('md-dice-groups', {
        userId,
        deleted: false
      })

      if (!groups.length) return session.text('.uninitialized')

      const groupInfo = await Promise.all(groups.map(async group => {
        const diceCount = await ctx.database
          .select('md-dices')
          .where({
            groupId: group.id,
            deleted: false
          })
          .execute(row => $.count(row.id))

        const latestDices = await ctx.database.get('md-dices',
          {
            groupId: group.id,
            deleted: false
          },
          {
            sort: { id: 'desc' }
          }
        )

        const latestNames = latestDices.length
          ? latestDices.map(d => d.name).join(', ')
          : session.text('.no-dice')

        return `${group.isPublic ? session.text(".public-prefix", [group.name, diceCount]) : session.text(".private-prefix", [group.name, diceCount])}\n  ${latestNames}`
      }))

      return `${session.text('.title')}\n${groupInfo.join('\n')}`
    })
}