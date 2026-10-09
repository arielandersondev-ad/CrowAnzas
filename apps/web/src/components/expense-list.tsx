import type { Expense, ExpenseWithUser } from "@crowanzas/contracts";
import { dateLabel, money } from "@/lib/format";
import Icon from "./icon";

export default function ExpenseList({ expenses, showOwner = false }: { expenses: (Expense | ExpenseWithUser)[]; showOwner?: boolean }) {
  return <ul className="expense-list">{expenses.map(expense => <li className="expense-row" key={expense.id}>
    <span className="expense-symbol"><Icon name="wallet" size={20}/></span>
    <div className="expense-details">
      {showOwner && "user" in expense && <div className="expense-owner"><span className="owner-dot"/>{expense.user.name}<span className="owner-code">#{expense.user.id.slice(0, 8)}</span></div>}
      <div className="expense-title"><h3>{expense.name}</h3><strong className="expense-amount">{money(expense.amount)}</strong></div>
      <div className="expense-meta"><span>{expense.quantity} {expense.quantity === 1 ? "unidad" : "unidades"}</span><span aria-hidden="true">·</span><time dateTime={expense.date}>{dateLabel(expense.date, true)}</time></div>
      {expense.description && <p>{expense.description}</p>}
    </div>
  </li>)}</ul>;
}
