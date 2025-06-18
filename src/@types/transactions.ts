export interface Transaction {
    date: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
  }
  