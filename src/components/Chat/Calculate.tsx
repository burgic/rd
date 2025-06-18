export function calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
  
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  
    return age;
  }
  
  export function calculateYearsToRetirement(age: number, retirementAge: number): number {
    return Math.max(0, retirementAge - age);
  }
  
  export function analyzeGoals(goals: { name: string; target: number; saved: number }[]): string[] {
    return goals.map((goal) => {
      const remaining = goal.target - goal.saved;
      const status = remaining > 0
        ? `You need to save $${remaining.toFixed(2)} more to reach your goal: ${goal.name}.`
        : `Congratulations! You have reached your goal: ${goal.name}.`;
      return status;
    });
  }
  
  export function suggestDebtRepayment(income: number, expenses: number, liabilities: number): string {
    const disposableIncome = income - expenses;
  
    if (disposableIncome <= 0) {
      return "Your expenses exceed your income. Consider cutting unnecessary expenses to pay off debts.";
    }
  
    const monthsToRepay = Math.ceil(liabilities / disposableIncome);
  
    return `With your current disposable income of $${disposableIncome.toFixed(2)}, you can pay off your debts in approximately ${monthsToRepay} months.`;
  }