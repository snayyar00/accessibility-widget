import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { insertPrice, Price, priceColumns } from './prices.repository'

export type ProductData = {
  id?: number
  name?: string
  type?: string
  stripe_id?: string
  created_at?: string
  updated_at?: string
}

export type FindProductAndPriceByTypeResponse = {
  id?: number
  name: string
  type: string
  stripeId: string
  createAt: string
  updatedAt: string
  price_id: number
  price_type: string
  price_stripe_id: string
  amount?: number
}

const TABLE = TABLES.products

export const productColumns = {
  id: 'products.id',
  name: 'products.name',
  type: 'products.type',
  stripeId: 'products.stripe_id',
  createAt: 'products.created_at',
  updatedAt: 'products.updated_at',
}

export async function insertProduct(productData: ProductData, priceDatas: Price[] = []): Promise<boolean> {
  let t

  try {
    t = await database.transaction()
    const [productId] = await database(TABLE).transacting(t).insert(productData)
    await insertPrice(
      priceDatas.map((priceItem) => ({
        ...priceItem,
        product_id: productId,
      })),
      t,
    )
    await t.commit()
    return true
  } catch (error) {
    console.log(error)
    if (t) t.rollback()
    return false
  }
}

export function findProductByType(type: string): Promise<ProductData> {
  return database(TABLE).where({ type }).first()
}

export function findProductById(ID: number): Promise<ProductData> {
  return database(TABLE).where({ ID }).first()
}

export function findProductInType(types: string[]): Promise<ProductData[]> {
  return database(TABLE).whereIn('type', types)
}

export function findProductAndPriceByType(productType: string, priceType: 'MONTHLY' | 'YEARLY'): Promise<FindProductAndPriceByTypeResponse> {
  return database(TABLE)
    .join(TABLES.prices, productColumns.id, priceColumns.productId)
    .select(productColumns, `${priceColumns.id} as price_id`, priceColumns.amount, `${priceColumns.type} as price_type`, `${priceColumns.stripeId} as price_stripe_id`)
    .where({ [productColumns.type]: productType, [priceColumns.type]: priceType })
    .first()
}

export function findProductByStripeId(stripeID: string): any {
  return database(TABLE)
    .join(TABLES.prices, productColumns.id, priceColumns.productId)
    .select(productColumns, `${priceColumns.id} as price_id`, priceColumns.amount, `${priceColumns.type} as price_type`, `${priceColumns.stripeId} as price_stripe_id`)
    .where({ [productColumns.stripeId]: stripeID })
    .first()
}

export async function updateProduct(productId: number, productData: ProductData, priceDatas: Price[] = []): Promise<boolean> {
  let t
  console.log('Updating')
  try {
    t = await database.transaction()

    // Update the product data
    await database(TABLE).transacting(t).where({ id: productId }).update(productData)

    // Delete existing prices associated with the product
    await database(TABLES.prices).transacting(t).where({ product_id: productId }).del()

    // Insert new prices
    await insertPrice(
      priceDatas.map((priceItem) => ({
        ...priceItem,
        product_id: productId,
      })),
      t,
    )

    // Commit the transaction
    await t.commit()

    return true
  } catch (error) {
    console.error(error)
    // Rollback the transaction if an error occurs
    if (t) await t.rollback()
    return false
  }
}
