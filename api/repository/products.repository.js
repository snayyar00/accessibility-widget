"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.findProductAndPriceByType = exports.findProductInType = exports.findProductByType = exports.insertProduct = exports.productColumns = void 0;
var database_config_1 = require("~/config/database.config");
var database_constant_1 = require("~/constants/database.constant");
var prices_repository_1 = require("./prices.repository");
var TABLE = database_constant_1.TABLES.products;
exports.productColumns = {
    id: 'products.id',
    name: 'products.name',
    type: 'products.type',
    stripeId: 'products.stripe_id',
    createAt: 'products.created_at',
    updatedAt: 'products.updated_at'
};
function insertProduct(productData, priceDatas) {
    if (priceDatas === void 0) { priceDatas = []; }
    return __awaiter(this, void 0, void 0, function () {
        var t, productId_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, database_config_1["default"].transaction()];
                case 1:
                    t = _a.sent();
                    return [4 /*yield*/, (0, database_config_1["default"])(TABLE).transacting(t).insert(productData)];
                case 2:
                    productId_1 = (_a.sent())[0];
                    return [4 /*yield*/, (0, prices_repository_1.insertPrice)(priceDatas.map(function (priceItem) { return (__assign(__assign({}, priceItem), { product_id: productId_1 })); }), t)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, t.commit()];
                case 4:
                    _a.sent();
                    return [2 /*return*/, true];
                case 5:
                    error_1 = _a.sent();
                    if (t)
                        t.rollback();
                    return [2 /*return*/, false];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.insertProduct = insertProduct;
function findProductByType(type) {
    return (0, database_config_1["default"])(TABLE).where({ type: type }).first();
}
exports.findProductByType = findProductByType;
function findProductInType(types) {
    return (0, database_config_1["default"])(TABLE).whereIn('type', types);
}
exports.findProductInType = findProductInType;
function findProductAndPriceByType(productType, priceType) {
    var _a;
    return (0, database_config_1["default"])(TABLE)
        .join(database_constant_1.TABLES.prices, exports.productColumns.id, prices_repository_1.priceColumns.productId)
        .select(exports.productColumns, "".concat(prices_repository_1.priceColumns.id, " as price_id"), prices_repository_1.priceColumns.amount, "".concat(prices_repository_1.priceColumns.type, " as price_type"), "".concat(prices_repository_1.priceColumns.stripeId, " as price_stripe_id"))
        .where((_a = {}, _a[exports.productColumns.type] = productType, _a[prices_repository_1.priceColumns.type] = priceType, _a))
        .first();
}
exports.findProductAndPriceByType = findProductAndPriceByType;
