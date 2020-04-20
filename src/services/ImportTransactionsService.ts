import { getRepository, getCustomRepository, In } from 'typeorm';

import fs from 'fs';
import csvParse from 'csv-parse';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface Request {
  file: Express.Multer.File;
}

interface ImportedTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: string;
  category: string;
  category_id: string;
}

class ImportTransactionsService {
  async execute({ file }: Request): Promise<Transaction[]> {
    const csvLines: ImportedTransaction[] = [];

    const stream = fs
      .createReadStream(file.path)
      .pipe(csvParse({ columns: true, ltrim: true }))
      .on('data', data => csvLines.push(data));

    await new Promise(resolve => stream.on('end', resolve));

    await fs.promises.unlink(file.path);

    const categoriesRepository = getRepository(Category);

    const categoriesTitles = csvLines
      .map(line => line.category)
      .filter((value, index, self) => self.indexOf(value) === index);

    const foundCategories = await categoriesRepository.find({
      where: {
        title: In(categoriesTitles),
      },
    });

    const inexistentCategoriesTitles = categoriesTitles.filter(
      categoryTitle =>
        !foundCategories.some(
          foundCategory => foundCategory.title === categoryTitle,
        ),
    );

    let newCategories: Category[] = [];

    if (inexistentCategoriesTitles.length) {
      newCategories = categoriesRepository.create(
        inexistentCategoriesTitles.map(title => ({
          title,
        })),
      );

      await categoriesRepository.save(newCategories);
    }

    const categories: Category[] = [...foundCategories, ...newCategories];

    const transcationsRepository = getCustomRepository(TransactionsRepository);

    const transactions = transcationsRepository.create(
      csvLines.map(line => ({
        title: line.title,
        type: line.type,
        value: parseFloat(line.value),
        category: categories.find(category => category.title === line.category),
      })),
    );

    await transcationsRepository.save(transactions);

    return transactions;
  }
}

export default ImportTransactionsService;
