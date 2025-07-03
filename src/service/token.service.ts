import { Context, Logger } from 'koishi'
import { TokenDao } from '../db/token.dao'
import { Token } from '../db'

export class TokenService {
    private readonly logger: Logger
    constructor(private tokenDao: TokenDao, ctx: Context) {
        this.logger = ctx.logger('more-dice').extend('token-service')
        this.logger.debug('TokenService initialized')
    }

    async addToken(userId: number, expire: number): Promise<Token | null> {
        return this.tokenDao.addToken(userId, expire)
            .catch(e => {
                throw new Error(`Failed to add token for user ${userId}: ${e.message}`)
            })
    }

    async getUserIdByToken(token: string): Promise<number | null> {
        return this.tokenDao.getToken(token)
            .then(result => {
                if (result) {
                    this.accessToken(result)
                    return result.userId
                } else {
                    this.logger.warn(`Token not found or expired: ${token}`)
                    return null
                }
            })
            .catch(e => {
                throw new Error(`Failed to get user ID by token ${token}: ${e.message}`)
            })
    }

    async deleteToken(token: string): Promise<boolean> {
        return this.tokenDao.deleteToken(token)
            .catch(e => {
                throw new Error(`Failed to delete token ${token}: ${e.message}`)
            })
    }

    async accessToken(token: Token): Promise<boolean> {
        return this.tokenDao.updateToken(token)
    }

    async clearTokens(userId: number): Promise<boolean> {
        return this.tokenDao.clearTokens(userId)
            .catch(e => {
                throw new Error(`Failed to clear tokens for user ${userId}: ${e.message}`)
            })
    }
}