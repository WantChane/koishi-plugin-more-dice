import { Context } from 'cordis'
import type { } from '@cordisjs/plugin-http'

import { JSONPath } from 'jsonpath-plus'

interface ParseOptions {
    jsonpath?: string
    ctx?: Context
}

export async function parseFaces(input: string, options?: ParseOptions): Promise<string[]> {
    try {
        // ==================== 网络资源处理 ====================
        if (input.startsWith('http://') || input.startsWith('https://')) {
            if (!options?.ctx) throw new Error('Context required for HTTP requests')

            const response = await options.ctx.http.get(input, {
                headers: { Accept: 'application/json' },
                responseType: 'json'
            })

            // 确认响应是 JSON 格式
            if (typeof response !== 'object' || response === null) {
                throw new Error('Non-JSON response received')
            }

            // 应用 JsonPath 或返回空数组
            return options?.jsonpath ?
                JSONPath({ path: options.jsonpath, json: response }).map(String) : []
        }

        // ==================== Base64 处理 ====================
        let content = input
        if (input.startsWith('base64:')) {
            const base64String = input.slice(7)
            content = Buffer.from(base64String, 'base64').toString('utf-8') // 单层解码 
        }

        // ==================== JSON 解析 ====================
        if (options?.jsonpath) {
            try {
                const json = JSON.parse(content)
                return JSONPath({ path: options.jsonpath, json: json }).map(String)
            } catch {
                return [] // JSON 解析失败返回空数组
            }
        }

        // ==================== 默认逗号分割 ====================
        return content.split(',').map(s => s.trim()).filter(Boolean)

    } catch (error) {
        return [] // 所有错误情况返回空数组
    }
}

/**
 * 验证名称是否合法（20个字符以内的英文或数字，必须以字母开头）
 * @param name 要验证的名称
 * @returns 是否合法
 */
export function validateName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9]{0,19}$/.test(name)
}