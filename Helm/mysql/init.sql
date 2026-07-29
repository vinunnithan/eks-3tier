CREATE DATABASE IF NOT EXISTS transactions;

USE transactions;

CREATE TABLE IF NOT EXISTS transactions (
    id INT NOT NULL AUTO_INCREMENT,
    amount DECIMAL(10,2),
    description VARCHAR(255),
    PRIMARY KEY (id)
);