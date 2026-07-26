const transactionService = require('./TransactionService');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const os = require('os');
const fetch = require('node-fetch');

const app = express();
const port = 4000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// ROUTES FOR OUR API
// =======================================================

//Health Checking
app.get('/health',(req,res)=>{
    res.json("This is the health check");
});

// ADD TRANSACTION
app.post('/transaction', (req,res)=>{
    transactionService.addTransaction(req.body.amount, req.body.desc, function(err, result){
        if (err) {
            return res.status(500).json({ message: 'something went wrong', error: err.message });
        }
        res.json({ message: 'added transaction successfully' });
    });
});

// GET ALL TRANSACTIONS
app.get('/transaction',(req,res)=>{
    transactionService.getAllTransactions(function (err, results) {
        if (err) {
            return res.status(500).json({ message: "could not get all transactions", error: err.message });
        }
        var transactionList = results.map(row => ({
            id: row.id,
            amount: row.amount,
            description: row.description
        }));
        res.json({ "result": transactionList });
    });
});

//DELETE ALL TRANSACTIONS
app.delete('/transaction',(req,res)=>{
    transactionService.deleteAllTransactions(function(err, result){
        if (err) {
            return res.status(500).json({ message: "Deleting all transactions failed.", error: err.message });
        }
        res.json({ message: "delete function execution finished." });
    });
});

//DELETE ONE TRANSACTION
app.delete('/transaction/id', (req,res)=>{
    transactionService.deleteTransactionById(req.body.id, function(err, result){
        if (err) {
            return res.status(500).json({ message: "error deleting transaction", error: err.message });
        }
        res.json({ message: `transaction with id ${req.body.id} deleted` });
    });
});

//GET SINGLE TRANSACTION
app.get('/transaction/id',(req,res)=>{
    transactionService.findTransactionById(req.body.id, function(err, result){
        if (err) {
            return res.status(500).json({ message: "error retrieving transaction", error: err.message });
        }
        if (!result || result.length === 0) {
            return res.status(404).json({ message: `no transaction found with id ${req.body.id}` });
        }
        var { id, amount, description } = result[0];
        res.json({ id, amount, description });
    });
});

app.listen(port, () => {
    console.log(`AB3 backend app listening at http://localhost:${port}`)
});