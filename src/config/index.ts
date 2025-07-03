import { Schema } from 'koishi'

interface Server {
    enabled?: boolean,
    path?: string,
    token_expire?: number,
}

export interface Config {
    DiceNameFormat: string,
    DiceNameTip: string,
    GroupNameFormat: string,
    GroupNameTip: string,
    RollResultTemplate: string,
    RollResultsTemplate: string,
    RollResultSeparator: string,
    Server: Server
}

export const Config: Schema<Config> = Schema.object({
    DiceNameFormat: Schema.string().default(
        '^[a-zA-Z][a-zA-Z0-9]{0,19}$'
    ),
    DiceNameTip: Schema.string().default(
        '骰子名称必须以字母开头，且长度不超过20个字符。只能包含字母和数字。'
    ),
    GroupNameFormat: Schema.string().default(
        '^[a-zA-Z][a-zA-Z0-9]{0,19}$'
    ),
    GroupNameTip: Schema.string().default(
        '骰子组名称必须以字母开头，且长度不超过20个字符。只能包含字母和数字。'
    ),
    RollResultsTemplate: Schema.string().default(
        '{index}. {face}'
    ),
    RollResultTemplate: Schema.string().default(
        '{face}'
    ),
    RollResultSeparator: Schema.string().default(
        '-'
    ),
    Server: Schema.intersect([
        Schema.object({
            enabled: Schema.boolean().default(false),
        }).description('基础配置'),
        Schema.union([
            Schema.object({
                enabled: Schema.const(true).required(),
                path: Schema.string().default('/more-dice'),
                token_expire: Schema.number().default(3600),
            }),
            Schema.object({}),
        ])
    ])
}).i18n({
    'zh-CN': require('../locale/zh-CN.yml')._config,
})