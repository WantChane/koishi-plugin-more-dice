import { Schema } from 'koishi'

export interface Config {
    DiceNameFormat: string,
    DiceNameTip: string,
    GroupNameFormat: string,
    GroupNameTip: string,
    RollResultSeparator: string,
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
    RollResultSeparator: Schema.string().default(
        '-'
    ),
}).i18n({
    'zh-CN': require('../locale/zh-CN.yml')._config,
})