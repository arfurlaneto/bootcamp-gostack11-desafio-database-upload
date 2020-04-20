import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const income = (await this.find({ type: 'income' }))
      .map(transaction => transaction.value)
      .reduce((acc, cur) => acc + cur, 0);

    const outcome = (await this.find({ type: 'outcome' }))
      .map(transaction => transaction.value)
      .reduce((acc, cur) => acc + cur, 0);

    return {
      income,
      outcome,
      total: income - outcome,
    };
  }
}

export default TransactionsRepository;
