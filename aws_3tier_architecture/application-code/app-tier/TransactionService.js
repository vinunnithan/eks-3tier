const dbcreds = require('./DbConfig');
const mysql = require('mysql2');

const con = mysql.createConnection({
    host: dbcreds.DB_HOST,
    port: dbcreds.DB_PORT,
    user: dbcreds.DB_USER,
    password: dbcreds.DB_PWD,
    database: dbcreds.DB_DATABASE
});

function addTransaction(amount, desc, callback){
    var sql = `INSERT INTO \`transactions\` (\`amount\`, \`description\`) VALUES (?, ?)`;
    con.query(sql, [amount, desc], function(err, result){
        if (err) return callback(err);
        console.log("Transaction added, id:", result.insertId);
        callback(null, result);
    });
}

function getAllTransactions(callback){
    var sql = "SELECT * FROM transactions";
    con.query(sql, function(err, result){
        if (err) return callback(err);
        console.log("Getting all transactions...");
        callback(null, result);
    });
}

function findTransactionById(id, callback){
    var sql = `SELECT * FROM transactions WHERE id = ?`;
    con.query(sql, [id], function(err, result){
        if (err) return callback(err);
        console.log(`retrieving transaction with id ${id}`);
        callback(null, result);
    });
}

function deleteAllTransactions(callback){
    var sql = "DELETE FROM transactions";
    con.query(sql, function(err, result){
        if (err) return callback(err);
        console.log("Deleting all transactions...");
        callback(null, result);
    });
}

function deleteTransactionById(id, callback){
    var sql = `DELETE FROM transactions WHERE id = ?`;
    con.query(sql, [id], function(err, result){
        if (err) return callback(err);
        console.log(`Deleting transaction with id ${id}`);
        callback(null, result);
    });
}

module.exports = {
    addTransaction,
    getAllTransactions,
    deleteAllTransactions,
    findTransactionById,
    deleteTransactionById
};