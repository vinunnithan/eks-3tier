module.exports = Object.freeze({
    DB_HOST : process.env.DB_HOST || 'mysql.database.svc.cluster.local',
    DB_PORT : process.env.DB_PORT || 3306,
    DB_USER : process.env.DB_USER || 'admin',
    DB_PWD : process.env.DB_PWD || '',
    DB_DATABASE : process.env.DB_DATABASE || 'transactions'
});