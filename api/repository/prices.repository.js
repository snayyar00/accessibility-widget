"use strict";
exports.__esModule = true;
exports.insertPrice = exports.priceColumns = void 0;
var database_config_1 = require("~/config/database.config");
var database_constant_1 = require("~/constants/database.constant");
var TABLE = database_constant_1.TABLES.prices;
exports.priceColumns = {
    id: 'prices.id',
    amount: 'prices.amount',
    type: 'prices.type',
    stripeId: 'prices.stripe_id',
    productId: 'prices.product_id',
    createAt: 'prices.created_at',
    updatedAt: 'prices.updated_at'
};
function insertPrice(priceData, transaction) {
    if (priceData === void 0) { priceData = []; }
    return (0, database_config_1["default"])(TABLE).insert(priceData).transacting(transaction);
}
exports.insertPrice = insertPrice;
