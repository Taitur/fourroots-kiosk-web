const sql = require("mssql")

const options = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    options: {
        encrypt:true,
        trustServerCertificate: true
    }

}

const getConnection = async () =>{
    const pool = await sql.connect(options)
    return pool
}

module.exports = {sql, getConnection}
