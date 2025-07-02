import { Context } from 'koishi'
export const name = 'more-dice'
export const inject = {
  required: ['database'],
  optional: ['http'],
}

export * from './config'

import { DiceDao, GroupDao, databaseInit, databaseReset } from './db'
import { GroupService } from './service'
import { DiceService } from './service/dice.service'

export function apply(ctx: Context) {
  ctx.i18n.define('zh-CN', require('./locale/zh-CN.yml'))

  const logger = ctx.logger('more-dice').extend('main')
  databaseInit(ctx)

  const groupDao = new GroupDao(ctx)
  const diceDao = new DiceDao(ctx)

  const groupService = new GroupService(groupDao, diceDao, ctx)
  const diceService = new DiceService(diceDao, groupService, ctx)

  const mainCmd = ctx.command('md')

  mainCmd.subcommand('.init')
    .userFields(['id'])
    .action(async ({ session }) => {
      const userId = session.user.id
      return await groupService.initGroup(userId)
        .then(
          result => result ? session.text('.init-success', [result.name]) : session.text('.init-failed')
        )
        .catch(error => {
          logger.error('Failed to initialize group:', error.message)
          return session.text(error.name, error.array)
        })
    })

  mainCmd.subcommand('.roll <input:string> [times:number]')
    .userFields(['id'])
    .action(async ({ session }, input, times) => {
      const userId = session.user.id
      return await diceService.rollDice(input, userId, times)
        .then(
          result => {
            if (result.length === 0) {
              return session.text('.roll-failed', [input])
            }
            if (result.length === 1) {
              return session.text('.roll-success', [input, result[0]])
            }
            return session.text('.multi-success', [times || 1, result.join('\n')])
          }
        )
        .catch(error => {
          logger.error('Failed to roll dice:', error.message)
          return session.text(error.name, error.array)
        })
    })

  mainCmd.subcommand('.reset', { authority: 4 })
    .action(async ({ session }) => {
      await session.send('是否清除所有数据？输入“是”确认。')
      await session.send('注意：此操作不可逆！所有骰子和分组数据将被删除。')
      const confirmation = await session.prompt(10000)
      logger.info('User confirmation for reset:', confirmation)
      if (confirmation === '是') {
        return databaseReset(ctx)
          .then(result => result ? session.text('.reset-success') : session.text('.reset-failed'))
          .catch(error => {
            logger.error('Failed to reset database:', error.message)
            return session.text(error.name, error.array)
          })
      }
    })


  const groupCmd = mainCmd.subcommand('.group')
  groupCmd.subcommand('.add <name:text>')
    .userFields(['id'])
    .action(async ({ session }, name) => {
      const userId = session.user.id
      return await groupService.addGroup(name, userId)
        .then(
          result => result ? session.text('.add-success', [name, result.id]) : session.text('.add-failed', [name])
        )
        .catch(error => {
          logger.error('Failed to add group:', error.message)
          return session.text(error.name, error.array)
        })
    })

  groupCmd.subcommand('.rename <input:string> <newName:string>')
    .userFields(['id'])
    .action(async ({ session }, input, newName) => {
      const userId = session.user.id
      return await groupService.renameGroup(input, userId, newName)
        .then(
          result => result > 0 ? session.text('.rename-success', [input, newName]) : session.text('.rename-failed', [input])
        )
        .catch(error => {
          logger.error('Failed to rename group:', error.message)
          return session.text(error.name, error.array)
        })
    })

  groupCmd.subcommand('.delete <input:string>')
    .userFields(['id'])
    .action(async ({ session }, input) => {
      const userId = session.user.id
      return await groupService.deleteGroup(input, userId)
        .then(
          result => result > 0 ? session.text('.delete-success', [input]) : session.text('.delete-failed', [input])
        )
        .catch(error => {
          this.logger.error('Failed to delete group:', error.message)
          return session.text(error.name, error.array)
        })
    })

  groupCmd.subcommand('.setpublic <input:string> <isPublic:number>')
    .userFields(['id'])
    .action(async ({ session }, input, isPublic) => {
      const userId = session.user.id
      const isPublicBool = !!isPublic
      return await groupService.setGroupPublic(input, userId, isPublicBool)
        .then(
          result => result > 0 ? session.text(isPublicBool ? '.setpublic-success-public' : '.setpublic-success-private', [input]) : session.text('.setpublic-failed', [input])
        )
        .catch(error => {
          this.logger.error('Failed to set group public status:', error.message)
          return session.text(error.name, error.array)
        })
    })

  groupCmd.subcommand('.clone <input:string> [newName:string]')
    .userFields(['id'])
    .action(async ({ session }, input, newName) => {
      const userId = session.user.id
      return await groupService.cloneGroup(input, userId, newName)
        .then(
          result => result ? session.text('.clone-success', [input, result.name]) : session.text('.clone-failed', [input])
        )
        .catch(error => {
          this.logger.error('Failed to clone group:', error.message)
          return session.text(error.name, error.array)
        })

    })

  const diceCmd = mainCmd.subcommand('.dice')
  diceCmd.subcommand('.add <name:string> <faces:text>')
    .option('group', '-g <group:string>')
    .option('object', '-o', { fallback: false })
    .option('jsonpath', '-j <jsonpath:string>')
    .userFields(['id'])
    .action(async ({ session, options }, name, faces) => {
      const userId = session.user.id
      return await diceService.addDice(name, userId, faces, options)
        .then(
          result => result ? session.text('.add-success', [name, result.id]) : session.text('.add-failed', [name])
        )
        .catch(error => {
          this.logger.error('Failed to add dice:', error.message)
          return session.text(error.name, error.array)
        })
    })



  diceCmd.subcommand('.set <name:string> <faces:text>')
    .option('group', '-g <group:string>')
    .option('object', '-o', { fallback: false })
    .option('jsonpath', '-j <jsonpath:string>')
    .userFields(['id'])
    .action(async ({ session, options }, name, faces) => {
      const userId = session.user.id
      return await diceService.setDiceFaces(name, userId, faces, options)
        .then(
          result => result ? session.text('.set-success', [name]) : session.text('.set-failed', [name])
        )
        .catch(error => {
          this.logger.error('Failed to set dice faces:', error.message)
          return session.text(error.name, error.array)
        })
    })

  diceCmd.subcommand('.delete <input:string>')
    .userFields(['id'])
    .action(async ({ session }, input) => {
      const userId = session.user.id
      return await diceService.deleteDice(input, userId)
        .then(
          result => result > 0 ? session.text('.delete-success', [input]) : session.text('.delete-failed', [input])
        )
        .catch(error => {
          this.logger.error('Failed to delete dice:', error.message)
          return session.text(error.name, error.array)
        })
    })

  diceCmd.subcommand('.rename <input:string> <newName:string>')
    .userFields(['id'])
    .action(async ({ session }, input, newName) => {
      const userId = session.user.id
      return await diceService.renameDice(input, userId, newName)
        .then(
          result => result > 0 ? session.text('.rename-success', [input, newName]) : session.text('.rename-failed', [input])
        )
        .catch(error => {
          this.logger.error('Failed to rename dice:', error.message)
          return session.text(error.name, error.array)
        })
    })
}
