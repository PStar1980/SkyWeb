import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true },
    category: { type: String },
    note: { type: String },
    date: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

export default mongoose.model("Transaction", transactionSchema);
