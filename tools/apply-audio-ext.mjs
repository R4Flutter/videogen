// One-off: extend the narration rows in vox_script.md so the film actually
// fills 10:00 (align.py tiles beats to speech+hold; the script's own times
// are intent, not length). Replaces each beat's Audio row in place, keeping
// every other row untouched. Run: node tools/apply-audio-ext.mjs
import { readFileSync, writeFileSync } from "node:fs";

const path = "video/vox_script.md";
let md = readFileSync(path, "utf8");

const AUDIO = {
  1: "They pay you two dollars to watch videos. Two dollars a video, sent to your phone, from a company you have never heard of.",
  2: "The machine behind that job was pulling in thirty million dollars a day. Thirty million dollars, every single day, from people who started exactly where you are.",
  3: "Same engine. Same script. Two dollars to watch, two hundred fifty to deposit. One script, printed once, handed to a thousand strangers at the same time.",
  4: "In October twenty twenty five, American prosecutors took the biggest single pile of it ever: fifteen billion dollars in bitcoin. Fifteen billion dollars, in one seizure, from one machine.",
  5: "Here's who was paying you. And how they got caught. It starts with a job offer you almost deleted.",
  6: "First, the offer. It arrives in your messages like every other side hustle. It is the one you actually answer.",
  7: "Watch ten videos. Screenshot the proof. Send it in. Twenty dollars. That's the whole job, and the job is real.",
  8: "Two dollars a video. Less than minimum wage — and that is exactly the point. The pay is the bait, not the job.",
  9: "See, the payment actually clears. Real money, into your balance, in eleven minutes. Eleven minutes, start to finish, no questions asked.",
  10: "Real app. Real payout. Support that answers in minutes. You tick every box, and the app ticks every one of yours.",
  11: "The balance climbs. Twenty. Forty. A hundred. It never goes down. That is the first thing you believe without being told to.",
  12: "Meaning the hook is the work. You aren't being paid to watch videos. You're being trained. The videos are the lesson plan.",
  13: "Within two days, a supervisor appears. A group. A commission ladder. You are not a worker anymore. You are an account.",
  14: "\"Congratulations — you've been promoted to VIP.\" That's the actual script. The same message, sent the same way, to everyone.",
  15: "Both ladders climb together: your earnings, and what you're asked to put up to reach the next rung. The second ladder is the one that matters.",
  16: "The money that arrives first is the mechanism. It deserves its own minute, because everything that follows depends on it.",
  17: "Instant payouts. A balance that grows. Support that answers. None of it was an accident. All of it was a stage.",
  18: "That first withdrawal isn't a payment. It's a coupon, and it costs them two dollars. Two dollars, spent to buy your belief.",
  19: "They spend two dollars to learn what you'll risk. You spend two dollars to believe they're real. The second two dollars is the one that matters.",
  20: "See, trust isn't built by the app. It's built by you, watching your own money arrive. They just supply the stage.",
  21: "The deposit clears, and you watch it. That's the moment the belief gets built — by you, with their server doing the work.",
  22: "Every question answered. Every time. A hundred staff, one conversation each. It feels like a company. It's a script with a headset.",
  23: "In the trade, they call it fattening. Feed the account. Build the belief. The kill comes later, and the kill is the business.",
  24: "Each tier is a rung. Each rung is a deposit you haven't made yet. The ladder only goes up, and every step costs you first.",
  25: "Then the rung that matters: two hundred fifty dollars, to unlock a faster payout tier. That's the first real deposit, and it lands.",
  26: "And it works. People pay it. Because the balance is real, and the balance is theirs. The catch is where that balance actually lives.",
  27: "Except the balance is a number on their server. The deposit is real money, moved. Two different things, wearing the same name.",
  28: "Some of it gets paid out, to make the next person trust the same screen. The rest moves on. The payout is the marketing budget.",
  29: "The turn happens when the amounts stop being small. That's when the script changes, and the ask gets serious.",
  30: "A platform fee of ten thousand. An unlock of twenty. A tax clearance of forty. Each one unlocks money that's already yours.",
  31: "Every reason to deposit has one thing in common: it unlocks money that's already yours. Money that, on their server, never moves.",
  32: "Their math: deposit to unlock. Your math: it's already in there. Two maths, one answer, and the answer is a transfer.",
  33: "The psychology is textbook. Sunk cost. Escape cost. The account is almost unlocked. Three hooks, and each one is a payment.",
  34: "But the balance is never unlocked. The rules change on the server, and the ask gets bigger. The goalpost moves with your money.",
  35: "And for the biggest accounts, they add a second layer: romance. Because a stranger asking for money is a scam. A partner asking is trust.",
  36: "A friend with a tip. A partner with a plan. An expert who always answers. Three roles, and none of them are real.",
  37: "The best accounts are fattened for months. The slaughter takes an hour. Ninety days of care, spent in one afternoon.",
  38: "\"I love you. Trust me. Just this once.\" It's a script. It has always been a script, and it's written for one audience.",
  39: "The deposit doesn't go to the platform. It goes to a wallet — and wallets leave receipts. That's the crack in the machine.",
  40: "The last frame the mark sees: the balance, the chat, and silence. Everything they trusted, still on screen, answering nothing.",
  41: "On their ledger, the account closes. The person stays open. The ledger has a row for your money, and no row for you.",
  42: "In Brooklyn alone, one network moved millions for this machine — two hundred fifty victims across the country. Two hundred fifty people, and that's only the ones who came forward.",
  43: "A hundred thousand targets. A thousand responses. A hundred deposits. Five locked accounts. The funnel narrows to a point, and the point is a person.",
  44: "Time to meet the machine that runs the numbers. It runs them from behind a wall, with a chairman at the top.",
  45: "The money doesn't land in a call center. It lands in Cambodia, at a compound with its own gate, its own walls, its own rules.",
  46: "Ten compounds. High walls. Barbed wire. Dormitories for hundreds of workers. It is a factory, and the product is persuasion.",
  47: "Phone farms: one facility alone held twelve hundred fifty phones. Twelve hundred fifty phones, each one running a conversation.",
  48: "Seventy six thousand accounts on one platform, out of two buildings. Two buildings, seventy six thousand imagined people.",
  49: "A ledger for every compound: which rooms run which scheme, and what each one profits. The machine kept its own books, and the books kept the machine.",
  50: "The labor was the product. Workers trafficked in, kept against their will, under threat of violence. The phones were rented. The people were owned.",
  51: "In twenty nineteen, the Golden Fortune compound went up. In twenty twenty one, millions of phone numbers and passwords were bought in bulk. The lists were the raw material.",
  52: "The founder of Prince Group, prosecutors say, bragged that the profit was considerable — because there is no cost. He said it out loud, and he wrote it down.",
  53: "The proceeds bought the usual: yachts, a private jet, and a Picasso through a New York auction house. The spoils of a script.",
  54: "The laundering ran on a diagram. Split the coins across a hundred addresses, recombine them into three. A hundred addresses is not anonymity. It's a paper trail.",
  55: "Every split is public. Every address is a receipt. The blockchain keeps the book, and the book never closes.",
  56: "October, twenty twenty five. The indictment lands in Brooklyn. The machine's own ledgers are the evidence.",
  57: "The chairman of Prince Group is charged with running the whole machine. The charges read like a user manual for it.",
  58: "FBI Director Patel called it one of the largest financial fraud takedowns in history. That's not a press line. That's a scale.",
  59: "A hundred twenty seven thousand two hundred seventy one bitcoin. Fifteen billion dollars. The largest seizure in DOJ history, sitting in wallets that held still.",
  60: "How? The coins sat in wallets whose keys one person held. Take the keys, and the pile stops moving. Fifteen billion dollars, frozen by a passphrase.",
  61: "And the tell that generalizes: an investment you can't withdraw from without depositing more is not an investment. It's a drain with a door.",
  62: "Real money withdraws. Real platforms never unlock your own balance. The rule fits in one sentence, and it would have saved every one of them.",
  63: "Ask to withdraw before you deposit. The answer is a number, and it's not yours. Zero is a number too, and it answers everything.",
  64: "They pay you two dollars to watch videos. The same sentence, one hour later, with everything you know about it changed.",
  65: "This machine took in thirty million dollars a day. And the two dollars a video is still what it looks like from the outside.",
  66: "The pay was never the product. You were. The videos were the bait, and the balance was the hook.",
  67: "The trap is the trust. That hasn't changed. It never needed to.",
  68: "Paid to watch videos — until the pay becomes the price. Two dollars in. Fifteen billion out. The balance was never yours.",
};

const BEAT_RE = /^###\s+BEAT\s+(\d+)\s+—/gm;
const rows = [...md.matchAll(BEAT_RE)];
let changed = 0;
let missing = 0;

// Bottom-up: each replacement lengthens the file, which shifts every index
// after it. Working backwards keeps the slices stable.
for (let i = rows.length - 1; i >= 0; i--) {
  const n = Number(rows[i][1]);
  const start = rows[i].index;
  const end = i + 1 < rows.length ? rows[i + 1].index : md.length;
  const block = md.slice(start, end);
  const audio = AUDIO[n];
  if (audio === undefined) {
    missing++;
    continue;
  }
  const rowRe = /^(\|\s*\*\*Audio\*\*\s*\|\s*).*?(\s*\|\s*)$/m;
  if (!rowRe.test(block)) {
    console.log(`beat ${n}: no Audio row found`);
    continue;
  }
  md = md.slice(0, start) + block.replace(rowRe, `$1${audio}$2`) + md.slice(end);
  changed++;
}

if (missing) console.log(`WARN: ${missing} beats in file have no extension defined`);
if (changed !== Object.keys(AUDIO).length) console.log(`WARN: changed ${changed} of ${Object.keys(AUDIO).length}`);
writeFileSync(path, md, "utf8");
console.log(`updated ${changed} Audio rows in ${path}`);
