import Transaction from "../models/Transaction.js";

export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({}).populate("userId", "name email");
    res.json(transactions);
  } catch (err) {
    next(err);
  }
};

export const createTransaction = async (req, res, next) => {
  try {
    const { userId, type, amount, category, note } = req.body;
    const txn = await Transaction.create({ userId, type, amount, category, note });
    res.status(201).json(txn);
  } catch (err) {
    next(err);
  }
};
