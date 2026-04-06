import {Pool} from 'pg'
import config from '@config'

export const pool = new Pool({
    port: config.get('postgres.port'),
    host: config.get('postgres.host'),
    password: config.get("postgres.password"),
    database: config.get("postgres.database"),
    user: config.get("postgres.user"),
    max: 100
})
