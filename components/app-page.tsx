"use client";

import Layout from "./layout";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  FileSpreadsheet,
  Moon,
  Sun,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Transaction = {
  id: number;
  amount: number;
  type: "income" | "expense" | "opening";
  category: string;
  date: string;
  currency: string;
};

type ExchangeRates = {
  [key: string]: number;
};

const EXCHANGE_RATES: ExchangeRates = {
  USD: 1,
  AED: 3.67,
  PKR: 283.5,
};

const STORAGE_KEY = "spendera_data";

const CATEGORIES = {
  income: ["Salary", "Freelance", "Recovered"],
  expense: [
    "Monthly - Utilities",
    "Monthly - Rent",
    "Monthly - Transportation",
    "Variable - Food",
    "Variable - Entertainment",
    "Variable - Transportation",
    "Recurring Investment",
  ],
};

export function BlockPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "income"
  );
  const [category, setCategory] = useState<string>("");
  const [currency, setCurrency] = useState<"AED" | "USD" | "PKR">("USD");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [showTransactions, setShowTransactions] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    saveData();
  }, [transactions, currency, selectedMonth]);

  useEffect(() => {
    setCategory("");
  }, [transactionType]);

  const loadData = () => {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setTransactions(parsedData.transactions || []);
        setCurrency(parsedData.currency || "USD");
        setSelectedMonth(
          parsedData.selectedMonth || new Date().toISOString().slice(0, 7)
        );
      }
    }
  };

  const saveData = () => {
    if (typeof window !== "undefined") {
      const dataToSave = {
        transactions,
        currency,
        selectedMonth,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const addTransaction = () => {
    if (amount && !isNaN(parseFloat(amount))) {
      const newTransaction: Transaction = {
        id: Date.now(),
        amount: parseFloat(amount),
        type: transactionType,
        category,
        date: `${selectedMonth}-01`,
        currency,
      };
      setTransactions([...transactions, newTransaction]);
      setAmount("");
    }
  };

  const convertToSelectedCurrency = (
    amountUSD: number | null | undefined
  ): string => {
    if (amountUSD == null) return "0.00";
    return (amountUSD * EXCHANGE_RATES[currency] || 0).toFixed(2);
  };

  const calculateFixedSavings = (): number => {
    const fixedIncome = transactions
      .filter(
        (t) =>
          t.type === "income" &&
          t.category === "Salary" &&
          t.date.startsWith(selectedMonth)
      )
      .reduce(
        (sum, t) => sum + (t.amount || 0) / (EXCHANGE_RATES[t.currency] || 1),
        0
      );
    const fixedExpenses = transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.category.startsWith("Monthly") &&
          t.date.startsWith(selectedMonth)
      )
      .reduce(
        (sum, t) => sum + (t.amount || 0) / (EXCHANGE_RATES[t.currency] || 1),
        0
      );
    return fixedIncome - fixedExpenses;
  };

  const calculateTotal = (type: "income" | "expense"): number => {
    return transactions
      .filter((t) => t.type === type && t.date.startsWith(selectedMonth))
      .reduce(
        (sum, t) => sum + (t.amount || 0) / (EXCHANGE_RATES[t.currency] || 1),
        0
      );
  };

  const totalIncome = calculateTotal("income");
  const totalExpenses = calculateTotal("expense");
  const savings = totalIncome - totalExpenses;

  const clearAllData = () => {
    setTransactions([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const exportToCSV = () => {
    const headers = ["Date", "Type", "Category", "Amount", "Currency"];
    const csvContent = [
      headers.join(","),
      ...transactions.map(
        (t) => `${t.date},${t.type},${t.category},${t.amount},${t.currency}`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "spendera_export.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadTemplate = () => {
    const template = XLSX.utils.book_new();
    const templateData = [
      ["Date", "Type", "Category", "Amount", "Currency"],
      ["YYYY-MM-DD", "income/expense", "category", "amount", "USD/AED/PKR"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    XLSX.utils.book_append_sheet(template, worksheet, "Template");
    XLSX.writeFile(template, "spendera_template.xlsx");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Skip the header row and process the data
        const newTransactions: Transaction[] = jsonData
          .slice(1)
          .map((row: any) => ({
            id: Date.now() + Math.random(),
            date: row[0] || "",
            type: (row[1] as "income" | "expense") || "expense",
            category: row[2] || "",
            amount: parseFloat(row[3]) || 0,
            currency: row[4] || "USD",
          }));

        setTransactions([...transactions, ...newTransactions]);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1
            className="text-4xl font-bold"
            style={{ fontFamily: "'Faculty Glyphic', sans-serif" }}
          >
            Spendera
          </h1>
          <Button variant="outline" size="icon" onClick={toggleDarkMode}>
            {darkMode ? (
              <Sun className="h-[1.2rem] w-[1.2rem]" />
            ) : (
              <Moon className="h-[1.2rem] w-[1.2rem]" />
            )}
          </Button>
        </div>

        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Add Transaction</CardTitle>
            <div className="flex space-x-2">
              <Select
                value={currency}
                onValueChange={(value: "AED" | "USD" | "PKR") =>
                  setCurrency(value)
                }
              >
                <SelectTrigger className="w-24 h-8 text-sm bg-background">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="PKR">PKR</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-36 h-8 text-sm bg-background"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div
                className="w-1/3 text-3xl font-bold focus:outline-none relative"
                contentEditable
                onBlur={(e) => setAmount(e.currentTarget.textContent || "")}
                onInput={(e) => setAmount(e.currentTarget.textContent || "")}
              >
                {amount ? (
                  <span>{amount}</span>
                ) : (
                  <span className="absolute top-0 left-0 text-muted-foreground">
                    0 {currency}
                  </span>
                )}
              </div>
              <Select
                value={transactionType}
                onValueChange={(value: "income" | "expense") =>
                  setTransactionType(value)
                }
              >
                <SelectTrigger className="w-1/3">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={category}
                onValueChange={(value: string) => setCategory(value)}
              >
                <SelectTrigger className="w-1/3">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES[transactionType].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={addTransaction}
                className={`w-full ${
                  transactionType === "income"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                } text-white`}
              >
                {transactionType === "income" ? (
                  <Plus className="mr-2" />
                ) : (
                  <Minus className="mr-2" />
                )}
                Add {transactionType === "income" ? "Income" : "Expense"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary (in {currency})</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">
              This month, you earned{" "}
              <span className="font-bold">
                {currency} {convertToSelectedCurrency(totalIncome)}
              </span>
              , spent {currency} {convertToSelectedCurrency(totalExpenses)}, and
              saved {currency} {convertToSelectedCurrency(savings)}.
            </p>
            <p className="text-lg mt-2">
              Your estimated monthly savings:{" "}
              <span className="font-bold">
                {currency} {convertToSelectedCurrency(calculateFixedSavings())}
              </span>
            </p>
            <TooltipProvider>
              <div className="mt-4 grid grid-cols-6 gap-2">
                <Button
                  onClick={() => setShowTransactions(!showTransactions)}
                  variant="outline"
                  className="col-span-4 justify-between"
                >
                  {showTransactions ? "Hide" : "Show"} Transactions
                  {showTransactions ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
                <div className="col-span-2 flex justify-center items-center space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={exportToCSV}
                        variant="outline"
                        size="icon"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export to CSV</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={downloadTemplate}
                        variant="outline"
                        size="icon"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download Template</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="icon"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload Excel</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
            {showTransactions && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .filter((t) => t.date.startsWith(selectedMonth))
                    .map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>{transaction.type}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell className="text-right">
                          {transaction.currency} {transaction.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4 flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Clear All Data</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear all the records and history. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllData}>
                      Yes, clear all data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
