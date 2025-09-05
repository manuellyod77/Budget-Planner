import React, { useState, useEffect, useMemo } from 'react';
// import Chart from 'chart.js/auto';
import './index.css';

// Constants for localStorage keys
const STORAGE_KEYS = {
  INCOME: 'income',
  EXPENSES: 'expenses',
  BUDGET_GOAL: 'budgetGoal'
};

// Reusable TransactionForm component
const TransactionForm = ({ type, onSubmit, transaction, setTransaction, categories }) => (
  <div className="input-group">
    <label htmlFor={`${type.toLowerCase()}-amount`} className="sr-only">
      {type} Amount
    </label>
    <input
      id={`${type.toLowerCase()}-amount`}
      type="number"
      value={transaction.amount}
      onChange={(e) => setTransaction({ ...transaction, amount: e.target.value })}
      placeholder="Enter amount"
      className="input"
      aria-label={`${type} amount`}
    />
    <label htmlFor={`${type.toLowerCase()}-category`} className="sr-only">
      {type} Category
    </label>
    <select
      id={`${type.toLowerCase()}-category`}
      value={transaction.category}
      onChange={(e) => setTransaction({ ...transaction, category: e.target.value })}
      className="select"
      aria-label={`${type} category`}
    >
      {categories.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
    </select>
    <button onClick={onSubmit} className="button" aria-label={`Add ${type}`}>
      Add {type}
    </button>
  </div>
);

// Error Boundary for Chart
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <div className="error">Chart failed to load. Please refresh the page.</div>;
    }
    return this.props.children;
  }
}

const BudgetPlanner = () => {
  const [income, setIncome] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INCOME);
    return saved ? JSON.parse(saved) : [];
  }); 
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : [];
  });
  const [budgetGoal, setBudgetGoal] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BUDGET_GOAL);
    return saved ? parseFloat(saved) : 0;
  });
  const [newIncome, setNewIncome] = useState({ amount: '', category: 'Salary' });
  const [newExpense, setNewExpense] = useState({ amount: '', category: 'Food' });
  const [newBudgetGoal, setNewBudgetGoal] = useState('');
  const [chartInstance, setChartInstance] = useState(null);

  // Validation function
  const isValidAmount = (amount) => {
    const numAmount = parseFloat(amount);
    return amount && !isNaN(numAmount) && numAmount > 0 && numAmount <= 1000000;
  };

  // Currency formatting
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INCOME, JSON.stringify(income));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    localStorage.setItem(STORAGE_KEYS.BUDGET_GOAL, budgetGoal.toString());
    updateChart();
  }, [income, expenses, budgetGoal]);

  const addIncome = () => {
    if (!isValidAmount(newIncome.amount)) return;
    setIncome([...income, { 
      id: Date.now(), 
      amount: parseFloat(newIncome.amount), 
      category: newIncome.category 
    }]);
    setNewIncome({ amount: '', category: 'Salary' });
  };

  const addExpense = () => {
    if (!isValidAmount(newExpense.amount)) return;
    setExpenses([...expenses, { 
      id: Date.now(), 
      amount: parseFloat(newExpense.amount), 
      category: newExpense.category 
    }]);
    setNewExpense({ amount: '', category: 'Food' });
  };

  const setBudget = () => {
    const numBudget = parseFloat(newBudgetGoal);
    if (!newBudgetGoal || isNaN(numBudget) || numBudget < 0 || numBudget > 1000000) return;
    setBudgetGoal(numBudget);
    setNewBudgetGoal('');
  };

  const deleteItem = (type, id, description) => {
    if (window.confirm(`Are you sure you want to delete ${description}?`)) {
      if (type === 'income') {
        setIncome(income.filter(item => item.id !== id));
      } else {
        setExpenses(expenses.filter(item => item.id !== id));
      }
    }
  };

  const calculateTotal = (items) => items.reduce((sum, item) => sum + item.amount, 0);
  
  // Memoized calculations
  const totalIncome = useMemo(() => calculateTotal(income), [income]);
  const totalExpenses = useMemo(() => calculateTotal(expenses), [expenses]);
  const balance = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);
  const isOverBudget = useMemo(() => budgetGoal > 0 && totalExpenses > budgetGoal, [budgetGoal, totalExpenses]);

  const updateChart = () => {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    const categories = [...new Set(expenses.map(exp => exp.category))];
    const categorySums = categories.map(cat =>
      expenses.filter(exp => exp.category === cat).reduce((sum, exp) => sum + exp.amount, 0)
    );

    try {
      const newChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: categories.length ? categories : ['No Expenses Yet'],
          datasets: [{
            data: categories.length ? categorySums : [1],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'],
          }],
        },
        options: {
          responsive: true,
          plugins: { 
            legend: { 
              position: 'top',
              labels: {
                padding: 20,
                usePointStyle: true,
              }
            } 
          },
        },
      });

      setChartInstance(newChart);
    } catch (error) {
      console.error('Chart rendering error:', error);
    }
  };

  // Category options
  const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Other'];
  const expenseCategories = ['Food', 'Transport', 'Housing', 'Entertainment', 'Other'];

  return (
    <div className="container">
      <h1 className="title">Budget Planner</h1>
      
      <div className="section">
        <h2 className="section-title">Set Monthly Budget Goal</h2>
        <div className="input-group">
          <label htmlFor="budget-goal" className="sr-only">Budget Goal</label>
          <input
            id="budget-goal"
            type="number"
            value={newBudgetGoal}
            onChange={(e) => setNewBudgetGoal(e.target.value)}
            placeholder="Enter budget goal"
            className="input"
            aria-label="Monthly budget goal"
          />
          <button onClick={setBudget} className="button" aria-label="Set budget goal">
            Set Budget
          </button>
        </div>
        {budgetGoal > 0 && (
          <p className="info">Monthly Budget Goal: {formatCurrency(budgetGoal)}</p>
        )}
        {isOverBudget && (
          <p className="alert" role="alert">
            Warning: Expenses ({formatCurrency(totalExpenses)}) exceed budget goal!
          </p>
        )}
      </div>

      <div className="section">
        <h2 className="section-title">Add Income</h2>
        <TransactionForm
          type="Income"
          onSubmit={addIncome}
          transaction={newIncome}
          setTransaction={setNewIncome}
          categories={incomeCategories}
        />
      </div>

      <div className="section">
        <h2 className="section-title">Add Expense</h2>
        <TransactionForm
          type="Expense"
          onSubmit={addExpense}
          transaction={newExpense}
          setTransaction={setNewExpense}
          categories={expenseCategories}
        />
      </div>

      <div className="section">
        <h2 className="section-title">Summary</h2>
        <p className="info">Total Income: {formatCurrency(totalIncome)}</p>
        <p className="info">Total Expenses: {formatCurrency(totalExpenses)}</p>
        <p className={`info ${balance < 0 ? 'negative' : ''}`}>
          Balance: {formatCurrency(balance)}
        </p>
      </div>

      <div className="section">
        <h2 className="section-title">Expense Breakdown</h2>
        <ChartErrorBoundary>
          <canvas id="expenseChart" className="chart" aria-label="Expense breakdown chart"></canvas>
        </ChartErrorBoundary>
      </div>

      <div className="section">
        <h2 className="section-title">Income List</h2>
        <ul className="list">
          {income.map(item => (
            <li key={item.id} className="list-item">
              {formatCurrency(item.amount)} - {item.category}
              <button 
                onClick={() => deleteItem('income', item.id, `income of ${formatCurrency(item.amount)} for ${item.category}`)} 
                className="delete-button"
                aria-label={`Delete income of ${formatCurrency(item.amount)} for ${item.category}`}
              >
                Delete
              </button>
            </li>
          ))}
          {income.length === 0 && (
            <li className="list-item empty">No income entries yet</li>
          )}
        </ul>
      </div>

      <div className="section">
        <h2 className="section-title">Expense List</h2>
        <ul className="list">
          {expenses.map(item => (
            <li key={item.id} className="list-item">
              {formatCurrency(item.amount)} - {item.category}
              <button 
                onClick={() => deleteItem('expense', item.id, `expense of ${formatCurrency(item.amount)} for ${item.category}`)} 
                className="delete-button"
                aria-label={`Delete expense of ${formatCurrency(item.amount)} for ${item.category}`}
              >
                Delete
              </button>
            </li>
          ))}
          {expenses.length === 0 && (
            <li className="list-item empty">No expense entries yet</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default BudgetPlanner;