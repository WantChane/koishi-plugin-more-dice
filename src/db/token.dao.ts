import { Context, Database, Tables, Logger, $ } from 'koishi'
import { Token } from './index'

// https://github.com/koishijs/webui/blob/aca9995b86bb6f3d09668a2492a66cbc5f2ceb1e/plugins/auth/src/index.ts#L66-L70
const letters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function randomId(length = 40) {
    return Array(length).fill(0).map(() => letters[Math.floor(Math.random() * letters.length)]).join('')
}

export class TokenDao {
    private readonly db: Database<Tables>
    private readonly logger: Logger
    private readonly tokenExpire: number
    constructor(ctx: Context) {
        this.db = ctx.database
        this.logger = ctx.logger('more-dice').extend('token-dao')
        this.tokenExpire = ctx.config.Server?.token_expire || 3600
        this.logger.debug('TokenDao initialized')
    }

    async addToken(userId: number, expire?: number): Promise<Token | null> {
        const token = randomId()
        const now = new Date()
        const expiresAt = new Date(now.getTime() + (expire || this.tokenExpire) * 1000)

        return this.db.create('md-tokens', {
            userId,
            token,
            createdAt: now,
            updatedAt: now,
            expiresAt
        })
            .catch(e => {
                throw new Error(`Failed to add token for user ${userId}: ${e.message}`)
            })
    }

    async getToken(token: string): Promise<Token | null> {

        return this.db.get('md-tokens', { token, expiresAt: { $gt: new Date() } })
            .then(result => {
                if (result && result.length > 0) {
                    return result[0]
                } else {
                    this.logger.warn(`Token not found or expired: ${token}`)
                    return null
                }
            }).catch(e => {
                throw new Error(`Failed to get user ID by token ${token}: ${e.message}`)
            })
    }

    async deleteToken(token: string): Promise<boolean> {
        return this.db.remove('md-tokens', { token })
            .then(({ matched }) => {
                if (matched > 0) {
                    this.logger.info(`Token deleted successfully: ${token}`)
                    return true
                } else {
                    this.logger.warn(`Token not found for deletion: ${token}`)
                    return false
                }
            })
            .catch(e => {
                throw new Error(`Failed to delete token ${token}: ${e.message}`)
            })
    }

    async updateToken(token: Token): Promise<boolean> {
        const now = new Date()
        token.updatedAt = now
        return this.db.set('md-tokens', { id: token.id }, {
            updatedAt: now
        })
            .then(({ matched }) => {
                if (matched > 0) {
                    this.logger.info(`Token updated successfully: ${token.token.slice(0, 8)}...`)
                    return true
                } else {
                    this.logger.warn(`Token not found for update: ${token.token.slice(0, 8)}...`)
                    return false
                }
            }).catch(e => {
                throw new Error(`Failed to update token ${token.token.slice(0, 8)}...: ${e.message}`)
            })
    }

    async clearTokens(userId: number): Promise<boolean> {
        return this.db.remove('md-tokens', { userId })
            .then(({ matched }) => {
                if (matched > 0) {
                    this.logger.info(`Tokens cleared successfully for user ${userId}`)
                    return true
                } else {
                    this.logger.warn(`No tokens found for user ${userId} to clear`)
                    return false
                }
            })
            .catch(e => {
                throw new Error(`Failed to clear tokens for user ${userId}: ${e.message}`)
            })
    }

}