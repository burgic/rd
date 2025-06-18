// Risk Profile Questions and Scoring System
// src/utils/riskAssessment/questions.ts

import { RiskQuestion } from './types';
  
  export const riskProfileQuestions: RiskQuestion[] = [
    // Investment Knowledge & Experience
    {
      id: 'knowledge_1',
      question: 'How would you rate your investment knowledge?',
      category: 'knowledge',
      answers: [
        { text: 'None - I have no knowledge of investments', score: 1 },
        { text: 'Basic - I understand the main asset classes', score: 2 },
        { text: 'Good - I understand different investment strategies', score: 3 },
        { text: 'Extensive - I have detailed investment knowledge', score: 4 }
      ]
    },
    {
      id: 'knowledge_2',
      question: 'Which investments have you held in the past?',
      category: 'knowledge',
      answers: [
        { text: 'Only cash savings', score: 1 },
        { text: 'Cash and bonds', score: 2 },
        { text: 'Stocks and shares', score: 3 },
        { text: 'Complex investments (options, alternatives, etc.)', score: 4 }
      ]
    },
  
    // Risk Attitude
    {
      id: 'attitude_1',
      question: 'If your investments fell 20% in one month, what would you do?',
      category: 'attitude',
      answers: [
        { text: 'Sell everything immediately', score: 1 },
        { text: 'Sell some investments', score: 2 },
        { text: 'Do nothing', score: 3 },
        { text: 'Buy more while prices are low', score: 4 }
      ]
    },
    {
      id: 'attitude_2',
      question: 'Which statement best describes your investment approach?',
      category: 'attitude',
      answers: [
        { text: 'I want to minimize risk of any losses', score: 1 },
        { text: 'I want to balance risk and returns', score: 2 },
        { text: 'I am comfortable with some volatility to achieve better returns', score: 3 },
        { text: 'I aim to maximize returns and can accept significant volatility', score: 4 }
      ]
    },
  
    // Risk Capacity
    {
      id: 'capacity_1',
      question: 'How stable is your employment income?',
      category: 'capacity',
      answers: [
        { text: 'Very unstable/temporary', score: 1 },
        { text: 'Somewhat unstable', score: 2 },
        { text: 'Stable', score: 3 },
        { text: 'Very stable/permanent', score: 4 }
      ]
    },
    {
      id: 'capacity_2',
      question: 'How many months of expenses could you cover from emergency savings?',
      category: 'capacity',
      answers: [
        { text: 'Less than 3 months', score: 1 },
        { text: '3-6 months', score: 2 },
        { text: '6-12 months', score: 3 },
        { text: 'More than 12 months', score: 4 }
      ]
    },
  
    // Investment Timeframe
    {
      id: 'timeframe_1',
      question: 'When do you expect to need to access most of your investments?',
      category: 'timeframe',
      answers: [
        { text: 'Within 3 years', score: 1 },
        { text: '3-5 years', score: 2 },
        { text: '5-10 years', score: 3 },
        { text: 'More than 10 years', score: 4 }
      ]
    }
  ];
  