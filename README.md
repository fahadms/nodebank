# Node Bank
Transfers money from one account to  another and list the current balance 

# Requirements
- node 8 or 9
- mysql
- mocha (for running tests)

#Configure

config.port = 3000;

//Database
config.database = 'nodebank';
config.username = 'root';
config.password = 'root';
config.table_prefix = '';

# Install
npm install

#Create Transfer (POST)
Create a new entry in the table with the parameters that are posted.

```
POST http://localhost:3000/api/transfer
```
**Response**
## Added an additional response paylod called 'sub_id'. Since the Database structure cannot be changed,
## We need an additional entry in the 'TRANSACTIONS' table, logging the detail of the Account Number from which the amount has been deducted
## The amount value in the transction table will be negative.
##
## The Transaction id for the Account, to which the Amount has been credited is indicated by 'id'. The amount entry in the transaction table 
## will be positive.
- If successful :
```json
{
    "id": inserted_id,
    "sub_id": inserted_id,
    "from": {
        "id": account_number_from,
        "balance": current_balance_from
    },
    "to": {
        "id": account_number_to,
        "balance": current_balance_to
    },
    "transfered": transfer_amount
}
```
- If parameters are missing :
```json
{
  "success": false,
  "erorr": various_error_message"
}
```


#### Run
```
npm start
```


#### Test
```
mocha
```