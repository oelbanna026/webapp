const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    GK: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    LB: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    LCB: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    RCB: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    RB: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    LCM: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    CM: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    RCM: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    LW: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    ST: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    RW: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    LM: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    RM: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
    ST2: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
  },
  { _id: false }
);

const squadSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    formation: { type: String, required: true, default: "4-3-3" },
    slots: { type: slotSchema, required: true, default: {} },
    rating: { type: Number, required: true, default: 0, min: 0, max: 99 },
  },
  { timestamps: true }
);

const Squad = mongoose.model("Squad", squadSchema);

module.exports = { Squad };
