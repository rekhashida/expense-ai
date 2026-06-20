import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ["Food","Transport","Shopping","Bills","Health","Entertainment","Education","Travel","Investment","EMI","Groceries","Other"];
const CAT_COLOR  = { Food:"#f97316",Transport:"#3b82f6",Shopping:"#a855f7",Bills:"#ef4444",Health:"#22c55e",Entertainment:"#f59e0b",Education:"#06b6d4",Travel:"#ec4899",Investment:"#10b981",EMI:"#f43f5e",Groceries:"#84cc16",Other:"#6b7280" };
const CAT_ICON   = { Food:"🍔",Transport:"🚗",Shopping:"🛍️",Bills:"💡",Health:"🏥",Entertainment:"🎬",Education:"📚",Travel:"✈️",Investment:"📈",EMI:"🏦",Groceries:"🛒",Other:"📦" };

const UPI_APPS = [
  { id:"gpay",   name:"Google Pay",  short:"GPay",  color:"#4285F4", bg:"#EAF0FB", icon:"G" },
  { id:"paytm",  name:"Paytm",       short:"Paytm", color:"#00BAF2", bg:"#E6F7FD", icon:"P" },
  { id:"phonepe",name:"PhonePe",     short:"PhonePe",color:"#5f259f",bg:"#F0E9F9", icon:"Ph"},
  { id:"bhim",   name:"BHIM UPI",    short:"BHIM",  color:"#00a651", bg:"#E6F5EE", icon:"B" },
  { id:"amazonpay",name:"Amazon Pay",short:"Amazon",color:"#FF9900", bg:"#FFF4E0", icon:"A" },
  { id:"cred",   name:"CRED",        short:"CRED",  color:"#1A1A2E", bg:"#E8E8F0", icon:"C" },
  { id:"navi",   name:"Navi",        short:"Navi",  color:"#7C3AED", bg:"#EDE9FF", icon:"N" },
  { id:"cash",   name:"Cash",        short:"Cash",  color:"#059669", bg:"#ECFDF5", icon:"₹" },
  { id:"card",   name:"Debit/Credit",short:"Card",  color:"#DC2626", bg:"#FEF2F2", icon:"💳"},
  { id:"netbanking",name:"Net Banking",short:"Bank",color:"#1D4ED8", bg:"#EFF6FF", icon:"🏛"},
];

const PAYMENT_LABELS = Object.fromEntries(UPI_APPS.map(u=>[u.id, u.name]));

const STORAGE_KEY = "expenseai_v4";
const OLD_STORAGE_KEY = "expenseai_v3";
const DEFAULT_BUDGET = 5000;
const INCOME_CATEGORIES = ["Salary","Freelance","Business","Rental","Interest","Gift","Refund","Other Income"];
const INCOME_ICON = { Salary:"💼",Freelance:"💻",Business:"🏢",Rental:"🏠",Interest:"🏦",Gift:"🎁",Refund:"↩️","Other Income":"💵" };

// ─── Storage ──────────────────────────────────────────────────────────────────
function defaultData() {
  return {
    profile: { name:"", avatar:"😊", upiId:"", phone:"", email:"", currency:"₹", budgetAlert:80 },
    budget: DEFAULT_BUDGET,
    categoryBudgets: {},   // { Food: 2000, Bills: 1500, ... }
    expenses: [],
    incomes: [],
    savingsGoals: [],
    recurringExpenses: [],
  };
}
function loadData() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if(r) {
      const parsed = JSON.parse(r);
      return { ...defaultData(), ...parsed, profile:{...defaultData().profile,...parsed.profile} };
    }
    const old = localStorage.getItem(OLD_STORAGE_KEY);
    if(old) {
      const parsed = JSON.parse(old);
      return { ...defaultData(), ...parsed, profile:{...defaultData().profile,...parsed.profile} };
    }
  } catch{}
  return defaultData();
}
function saveData(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch{} }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n,cur="₹") => `${cur}${Number(n).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = s => new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
const monthKey = d => { const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`; };
const nowMonth = () => monthKey(new Date());
const todayStr = () => new Date().toISOString().split("T")[0];
const AVATARS = ["😊","🧑","👩","👨","🧔","👩‍💼","👨‍💼","🦸","🧙","🎯","💼","🌟"];

// ─── Mini Charts ──────────────────────────────────────────────────────────────
function DonutChart({ segs, size=110, sw=16 }) {
  const r=(size-sw)/2, circ=2*Math.PI*r;
  const total=segs.reduce((a,s)=>a+s.v,0);
  if(!total) return <svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={sw}/></svg>;
  let off=0;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      {segs.map((s,i)=>{
        const pct=s.v/total, dash=circ*pct, gap=circ-dash;
        const el=<circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.c} strokeWidth={sw} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-off*circ}/>;
        off+=pct; return el;
      })}
    </svg>
  );
}

function BudgetRing({ pct }) {
  const color = pct>0.9?"#ef4444":pct>0.7?"#f59e0b":"#10b981";
  const r=50,sw=10,cx=60,cy=60,circ=2*Math.PI*r;
  const dash=circ*Math.min(pct,1);
  return (
    <svg width={120} height={120}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={sw}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ*0.25}
        strokeLinecap="round" style={{transition:"stroke-dasharray 0.6s ease"}}/>
      <text x={cx} y={cy-6} textAnchor="middle" fill={color} fontSize="18" fontWeight="800">{Math.round(pct*100)}%</text>
      <text x={cx} y={cy+12} textAnchor="middle" fill="#64748b" fontSize="10">used</text>
    </svg>
  );
}

function SparkBar({ data, highlight }) {
  const max=Math.max(...data.map(d=>d.v),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:5,height:80}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <div style={{width:"100%",borderRadius:"4px 4px 0 0",background:d.k===highlight?"#6366f1":"#1e293b",
            height:`${(d.v/max)*64}px`,minHeight:d.v?3:0,transition:"height 0.5s ease",border:d.k===highlight?"1px solid #818cf8":"1px solid #334155"}}/>
          <span style={{fontSize:9,color:d.k===highlight?"#818cf8":"#475569"}}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── UPI App Badge ────────────────────────────────────────────────────────────
function UPIBadge({ id, size=22 }) {
  const app = UPI_APPS.find(u=>u.id===id);
  if(!app) return null;
  return (
    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",
      width:size,height:size,borderRadius:6,background:app.color,color:"#fff",
      fontSize:size*0.45,fontWeight:800,flexShrink:0}}>
      {app.icon.length>1?app.icon:<span style={{fontSize:size*0.5}}>{app.icon}</span>}
    </span>
  );
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────
function AIChat({ messages, loading }) {
  const ref=useRef(null);
  useEffect(()=>{ if(ref.current) ref.current.scrollTop=ref.current.scrollHeight; },[messages,loading]);
  return (
    <div ref={ref} style={{height:240,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,padding:"4px 0"}}>
      {messages.map((m,i)=>(
        <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
          <div style={{maxWidth:"84%",padding:"10px 14px",
            borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
            background:m.role==="user"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#0f172a",
            color:"#f1f5f9",fontSize:13,lineHeight:1.6,
            border:m.role==="assistant"?"1px solid #1e293b":"none",
            boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
            {m.role==="assistant"&&<span style={{fontSize:10,color:"#818cf8",display:"block",marginBottom:3,fontWeight:700,letterSpacing:0.5}}>✨ AI ADVISOR</span>}
            <span style={{whiteSpace:"pre-wrap"}}>{m.content}</span>
          </div>
        </div>
      ))}
      {loading&&(
        <div style={{display:"flex",gap:5,padding:"10px 14px",background:"#0f172a",borderRadius:16,width:"fit-content",border:"1px solid #1e293b"}}>
          {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#6366f1",animation:"bounce 1s infinite",animationDelay:`${i*0.2}s`}}/>)}
        </div>
      )}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if(!toast) return null;
  const colors={success:"#059669",error:"#dc2626",info:"#0284c7",warn:"#d97706"};
  return (
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,padding:"12px 18px",borderRadius:12,
      background:colors[toast.type]||colors.success,color:"#fff",fontSize:13,fontWeight:700,
      boxShadow:"0 8px 24px rgba(0,0,0,0.5)",animation:"slideIn 0.3s ease",maxWidth:280,display:"flex",alignItems:"center",gap:8}}>
      {toast.type==="success"&&"✅"}{toast.type==="error"&&"❌"}{toast.type==="info"&&"ℹ️"}{toast.type==="warn"&&"⚠️"}
      {toast.msg}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ show, title, children, onClose }) {
  if(!show) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:640,
        maxHeight:"90vh",overflowY:"auto",animation:"slideUp 0.3s ease"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#0f172a"}}>
          <span style={{fontWeight:700,fontSize:16}}>{title}</span>
          <button onClick={onClose} style={{background:"#1e293b",border:"none",color:"#94a3b8",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{padding:"16px 20px 32px"}}>{children}</div>
      </div>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ label, icon, ...props }) {
  return (
    <div style={{marginBottom:14}}>
      {label&&<label style={{fontSize:11,color:"#64748b",fontWeight:700,display:"block",marginBottom:5,letterSpacing:0.5}}>{label}</label>}
      <div style={{position:"relative"}}>
        {icon&&<span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16}}>{icon}</span>}
        <input {...props} style={{width:"100%",padding:`12px 14px 12px ${icon?"40px":"14px"}`,borderRadius:12,
          background:"#020617",border:"1px solid #334155",color:"#f1f5f9",fontSize:14,fontWeight:500,
          outline:"none",...(props.style||{})}}/>
      </div>
    </div>
  );
}

function Select({ label, icon, children, ...props }) {
  return (
    <div style={{marginBottom:14}}>
      {label&&<label style={{fontSize:11,color:"#64748b",fontWeight:700,display:"block",marginBottom:5,letterSpacing:0.5}}>{label}</label>}
      <div style={{position:"relative"}}>
        {icon&&<span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>{icon}</span>}
        <select {...props} style={{width:"100%",padding:`12px 14px 12px ${icon?"40px":"14px"}`,borderRadius:12,
          background:"#020617",border:"1px solid #334155",color:"#f1f5f9",fontSize:14,fontWeight:500,
          outline:"none",appearance:"none",...(props.style||{})}}>
          {children}
        </select>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [data, setData]       = useState(loadData);
  const [tab, setTab]         = useState("dashboard");
  const [toast, setToast]     = useState(null);
  const [modals, setModals]   = useState({ add:false, goal:false, recurring:false, upi:false, filter:false, income:false, catBudget:false, deleteConfirm:null, deleteIncomeConfirm:null });

  // Add/Edit form
  const blankForm = { title:"", amount:"", category:"Food", date:todayStr(), note:"", paymentMethod:"gpay", tags:"" };
  const [form, setForm]   = useState(blankForm);
  const [editId, setEditId] = useState(null);

  // Income form
  const blankIncome = { title:"", amount:"", category:"Salary", date:todayStr(), note:"" };
  const [incomeForm, setIncomeForm] = useState(blankIncome);
  const [editIncomeId, setEditIncomeId] = useState(null);

  // Filter
  const [filterMonth, setFilterMonth] = useState(nowMonth());
  const [filterCat,   setFilterCat]   = useState("All");
  const [filterPay,   setFilterPay]   = useState("All");
  const [search,      setSearch]      = useState("");
  const [historySubTab, setHistorySubTab] = useState("expenses"); // "expenses" | "income"

  // AI
  const [aiMsgs,    setAiMsgs]    = useState([{ role:"assistant", content:"Hi! 👋 I'm your AI financial advisor. I can analyze your spending, suggest budgets, warn you about overspending, and help you save money. What would you like to know?" }]);
  const [aiInput,   setAiInput]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Savings goal form
  const blankGoal = { name:"", target:"", saved:"", deadline:"", icon:"🎯" };
  const [goalForm, setGoalForm] = useState(blankGoal);
  const [editGoalId, setEditGoalId] = useState(null);

  // Recurring form
  const blankRecur = { title:"", amount:"", category:"Bills", paymentMethod:"gpay", frequency:"monthly", nextDate:todayStr() };
  const [recurForm, setRecurForm] = useState(blankRecur);

  // Category budget editing (temp local state while modal open)
  const [catBudgetDraft, setCatBudgetDraft] = useState({});

  useEffect(()=>{ saveData(data); },[data]);

  // Toast helper
  const showToast = useCallback((msg, type="success") => {
    setToast({msg,type}); setTimeout(()=>setToast(null),3000);
  },[]);

  const openModal  = k => setModals(m=>({...m,[k]:true}));
  const closeModal = k => setModals(m=>({...m,[k]:false}));

  // Derived
  const cur        = data.profile.currency||"₹";
  const currExp    = data.expenses.filter(e=>monthKey(e.date)===nowMonth());
  const currInc    = (data.incomes||[]).filter(e=>monthKey(e.date)===nowMonth());
  const currSpent  = currExp.reduce((a,e)=>a+e.amount,0);
  const currIncome = currInc.reduce((a,e)=>a+e.amount,0);
  const netSavings = currIncome - currSpent;
  const remaining  = data.budget - currSpent;
  const budgetPct  = currSpent/data.budget;
  const alertPct   = (data.profile.budgetAlert||80)/100;

  // Spending prediction: linear projection based on days elapsed
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
  const projectedSpend = dayOfMonth > 0 ? (currSpent / dayOfMonth) * daysInMonth : 0;
  const projectedOverBudget = projectedSpend > data.budget;

  // Category budget derived: spend per category this month vs limit
  const categoryBudgetStatus = Object.entries(data.categoryBudgets||{})
    .filter(([,limit])=>limit>0)
    .map(([catName,limit])=>{
      const spent = currExp.filter(e=>e.category===catName).reduce((a,e)=>a+e.amount,0);
      return { category:catName, limit, spent, pct: spent/limit };
    });

  // Recurring due check
  useEffect(()=>{
    const today=todayStr();
    const due=data.recurringExpenses.filter(r=>r.nextDate<=today);
    if(due.length>0) showToast(`${due.length} recurring expense(s) due today!`,"warn");
  },[]);

  // ── filtered history ──────────────────────────────────────────────────
  const allMonths = [...new Set(data.expenses.map(e=>monthKey(e.date)))].sort().reverse();
  if(!allMonths.includes(nowMonth())) allMonths.unshift(nowMonth());

  const filteredExp = data.expenses
    .filter(e=>monthKey(e.date)===filterMonth)
    .filter(e=>filterCat==="All"||e.category===filterCat)
    .filter(e=>filterPay==="All"||e.paymentMethod===filterPay)
    .filter(e=>!search||e.title.toLowerCase().includes(search.toLowerCase())||e.note?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>new Date(b.date)-new Date(a.date));

  const filtSpent = filteredExp.reduce((a,e)=>a+e.amount,0);

  const filteredIncomes = (data.incomes||[])
    .filter(e=>monthKey(e.date)===filterMonth)
    .filter(e=>!search||e.title.toLowerCase().includes(search.toLowerCase())||e.note?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>new Date(b.date)-new Date(a.date));

  const filtIncomeTotal = filteredIncomes.reduce((a,e)=>a+e.amount,0);

  // category breakdown for filter month
  const catBreakdown = CATEGORIES.map(c=>({
    label:c, color:CAT_COLOR[c],
    v:filteredExp.filter(e=>e.category===c).reduce((a,e)=>a+e.amount,0)
  })).filter(c=>c.v>0).sort((a,b)=>b.v-a.v);

  // Payment method breakdown
  const payBreakdown = UPI_APPS.map(u=>({
    label:u.short, color:u.color,
    v:filteredExp.filter(e=>e.paymentMethod===u.id).reduce((a,e)=>a+e.amount,0)
  })).filter(u=>u.v>0).sort((a,b)=>b.v-a.v);

  // 6-month trend
  const monthTrend = Array.from({length:6},(_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-(5-i));
    const k=monthKey(d);
    return { k, label:d.toLocaleString("default",{month:"short"}), v:data.expenses.filter(e=>monthKey(e.date)===k).reduce((a,e)=>a+e.amount,0) };
  });

  // ── Add/Edit expense ──────────────────────────────────────────────────
  const handleSave = () => {
    if(!form.title.trim()||!form.amount||isNaN(form.amount)||Number(form.amount)<=0) {
      showToast("Enter a valid title and amount.","error"); return;
    }
    if(editId) {
      setData(d=>({...d,expenses:d.expenses.map(e=>e.id===editId?{...e,...form,amount:Number(form.amount)}:e)}));
      setEditId(null); showToast("Expense updated! ✏️");
    } else {
      setData(d=>({...d,expenses:[{id:Date.now(),...form,amount:Number(form.amount)},... d.expenses]}));
      showToast("Expense added! 💰");
      // Budget alert
      const newSpent=currSpent+Number(form.amount);
      if(newSpent/data.budget>=alertPct && currSpent/data.budget<alertPct)
        setTimeout(()=>showToast(`⚠️ You've used ${Math.round(newSpent/data.budget*100)}% of your budget!`,"warn"),600);
    }
    setForm(blankForm); closeModal("add");
  };

  const handleEdit = exp => { setForm({...exp,amount:String(exp.amount),tags:exp.tags||""}); setEditId(exp.id); openModal("add"); };
  const handleDelete = id => { setData(d=>({...d,expenses:d.expenses.filter(e=>e.id!==id)})); setModals(m=>({...m,deleteConfirm:null})); showToast("Deleted.","info"); };

  // ── Income ────────────────────────────────────────────────────────────
  const handleSaveIncome = () => {
    if(!incomeForm.title.trim()||!incomeForm.amount||isNaN(incomeForm.amount)||Number(incomeForm.amount)<=0) {
      showToast("Enter a valid title and amount.","error"); return;
    }
    if(editIncomeId) {
      setData(d=>({...d,incomes:(d.incomes||[]).map(e=>e.id===editIncomeId?{...e,...incomeForm,amount:Number(incomeForm.amount)}:e)}));
      setEditIncomeId(null); showToast("Income updated! ✏️");
    } else {
      setData(d=>({...d,incomes:[{id:Date.now(),...incomeForm,amount:Number(incomeForm.amount)},...(d.incomes||[])]}));
      showToast("Income added! 💵");
    }
    setIncomeForm(blankIncome); closeModal("income");
  };
  const handleEditIncome = inc => { setIncomeForm({...inc,amount:String(inc.amount)}); setEditIncomeId(inc.id); openModal("income"); };
  const handleDeleteIncome = id => { setData(d=>({...d,incomes:(d.incomes||[]).filter(e=>e.id!==id)})); setModals(m=>({...m,deleteIncomeConfirm:null})); showToast("Income removed.","info"); };

  // ── Category Budgets ─────────────────────────────────────────────────
  const openCatBudgetModal = () => { setCatBudgetDraft({...data.categoryBudgets}); openModal("catBudget"); };
  const saveCatBudgets = () => {
    const cleaned = {};
    Object.entries(catBudgetDraft).forEach(([k,v])=>{ if(v && Number(v)>0) cleaned[k]=Number(v); });
    setData(d=>({...d,categoryBudgets:cleaned}));
    closeModal("catBudget"); showToast("Category budgets saved! 🎯");
  };

  // ── Savings goals ─────────────────────────────────────────────────────
  const handleSaveGoal = () => {
    if(!goalForm.name||!goalForm.target) { showToast("Name and target required.","error"); return; }
    if(editGoalId) {
      setData(d=>({...d,savingsGoals:d.savingsGoals.map(g=>g.id===editGoalId?{...g,...goalForm,target:Number(goalForm.target),saved:Number(goalForm.saved||0)}:g)}));
      setEditGoalId(null); showToast("Goal updated!");
    } else {
      setData(d=>({...d,savingsGoals:[...d.savingsGoals,{id:Date.now(),...goalForm,target:Number(goalForm.target),saved:Number(goalForm.saved||0)}]}));
      showToast("Goal created! 🎯");
    }
    setGoalForm(blankGoal); closeModal("goal");
  };

  const deleteGoal = id => { setData(d=>({...d,savingsGoals:d.savingsGoals.filter(g=>g.id!==id)})); showToast("Goal removed.","info"); };
  const addToGoal = (id, amt) => {
    setData(d=>({...d,savingsGoals:d.savingsGoals.map(g=>g.id===id?{...g,saved:Math.min(g.saved+amt,g.target)}:g)}));
    showToast(`Added ${fmt(amt,cur)} to goal!`);
  };

  // ── Recurring ─────────────────────────────────────────────────────────
  const handleSaveRecur = () => {
    if(!recurForm.title||!recurForm.amount) { showToast("Title and amount required.","error"); return; }
    setData(d=>({...d,recurringExpenses:[...d.recurringExpenses,{id:Date.now(),...recurForm,amount:Number(recurForm.amount)}]}));
    showToast("Recurring expense saved! 🔄"); setRecurForm(blankRecur); closeModal("recurring");
  };

  const payRecurring = r => {
    const exp={id:Date.now(),title:r.title,amount:r.amount,category:r.category,date:todayStr(),note:`Auto: ${r.frequency}`,paymentMethod:r.paymentMethod,tags:"recurring"};
    // advance nextDate
    const nd=new Date(r.nextDate);
    if(r.frequency==="weekly") nd.setDate(nd.getDate()+7);
    else if(r.frequency==="monthly") nd.setMonth(nd.getMonth()+1);
    else if(r.frequency==="yearly") nd.setFullYear(nd.getFullYear()+1);
    setData(d=>({...d,
      expenses:[exp,...d.expenses],
      recurringExpenses:d.recurringExpenses.map(x=>x.id===r.id?{...x,nextDate:nd.toISOString().split("T")[0]}:x)
    }));
    showToast(`${r.title} marked as paid ✅`);
  };

  const deleteRecur = id => { setData(d=>({...d,recurringExpenses:d.recurringExpenses.filter(r=>r.id!==id)})); showToast("Removed.","info"); };

  // ── AI ────────────────────────────────────────────────────────────────
  const sendAI = async () => {
    if(!aiInput.trim()||aiLoading) return;
    const msg=aiInput.trim(); setAiInput(""); setAiLoading(true);
    setAiMsgs(m=>[...m,{role:"user",content:msg}]);

    const payUsage=payBreakdown.map(p=>`${p.label}: ${fmt(p.v,cur)}`).join(", ");
    const topCats=catBreakdown.slice(0,5).map(c=>`${c.label}: ${fmt(c.v,cur)}`).join(", ");
    const goals=data.savingsGoals.map(g=>`${g.name}: ${fmt(g.saved,cur)}/${fmt(g.target,cur)}`).join(", ");
    const recurring=data.recurringExpenses.map(r=>`${r.title} ${fmt(r.amount,cur)}/${r.frequency}`).join(", ");
    const catBudgetLines = categoryBudgetStatus.map(c=>`${c.category}: ${fmt(c.spent,cur)}/${fmt(c.limit,cur)} (${Math.round(c.pct*100)}%)`).join(", ");

    const systemPrompt = `You are an expert personal finance AI advisor built into ExpenseAI, an Indian expense tracker app. You speak in a friendly, direct, helpful tone. Give concrete, actionable advice.

User profile: ${data.profile.name||"User"}, Overall Budget: ${fmt(data.budget,cur)}/month
Current month: Spent ${fmt(currSpent,cur)}, Income ${fmt(currIncome,cur)}, Net savings ${fmt(netSavings,cur)}, Remaining budget ${fmt(remaining,cur)}, Budget usage: ${Math.round(budgetPct*100)}%
Projected month-end spend (linear): ${fmt(projectedSpend,cur)} ${projectedOverBudget?"(projected to EXCEED budget)":"(on track)"}
Category budgets: ${catBudgetLines||"none set"}
Top spending categories: ${topCats||"none yet"}
Payment methods used: ${payUsage||"none"}
Savings goals: ${goals||"none"}
Recurring expenses: ${recurring||"none"}
Total expenses tracked: ${data.expenses.length}
Monthly trend (last 6 months): ${monthTrend.map(m=>`${m.label}: ${fmt(m.v,cur)}`).join(", ")}

Keep responses concise (3-5 sentences). Use ₹ for amounts. Be specific and personalized.`;

    try {
      // Calls your own backend (see /server folder) which securely holds the Anthropic API key.
      // In the Claude.ai artifact preview, this same code transparently calls the Anthropic API directly.
      const resp=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          system: systemPrompt,
          messages:[...aiMsgs.slice(-8).map(m=>({role:m.role,content:m.content})),{role:"user",content:msg}]
        })
      });
      const d=await resp.json();
      const text=d.content?.map(c=>c.text||"").join("")||d.error||"Sorry, I'm unable to respond right now. Try again!";
      setAiMsgs(m=>[...m,{role:"assistant",content:text}]);
    } catch {
      setAiMsgs(m=>[...m,{role:"assistant",content:"Connection issue — make sure the backend server is running (see README). Try again!"}]);
    }
    setAiLoading(false);
  };

  // ── Export CSV ────────────────────────────────────────────────────────
  const exportCSV = () => {
    const expHeader="Type,Date,Title,Amount,Category,Payment Method,Note\n";
    const expRows=data.expenses.map(e=>`Expense,${e.date},"${e.title}",${e.amount},${e.category},${PAYMENT_LABELS[e.paymentMethod]||e.paymentMethod},"${e.note||""}"`).join("\n");
    const incRows=(data.incomes||[]).map(e=>`Income,${e.date},"${e.title}",${e.amount},${e.category},,"${e.note||""}"`).join("\n");
    const blob=new Blob([expHeader+expRows+(incRows?"\n"+incRows:"")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="expenseai-report.csv"; a.click();
    showToast("CSV exported! 📥");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const TABS = [
    {key:"dashboard",icon:"📊",label:"Home"},
    {key:"history",icon:"📋",label:"History"},
    {key:"goals",icon:"🎯",label:"Goals"},
    {key:"ai",icon:"🤖",label:"AI"},
    {key:"profile",icon:"👤",label:"Profile"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#020617",color:"#f1f5f9",fontFamily:"'Inter',system-ui,sans-serif",paddingBottom:88}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select,textarea{font-family:inherit;outline:none}
        button{font-family:inherit;cursor:pointer}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#020617}::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1) opacity(0.4)}
        select option{background:#0f172a;color:#f1f5f9}
      `}</style>

      <Toast toast={toast}/>

      {/* Delete confirm */}
      <Modal show={!!modals.deleteConfirm} title="Delete Expense?" onClose={()=>setModals(m=>({...m,deleteConfirm:null}))}>
        <p style={{color:"#94a3b8",marginBottom:20,fontSize:14}}>This cannot be undone.</p>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setModals(m=>({...m,deleteConfirm:null}))} style={{flex:1,padding:12,borderRadius:12,background:"#1e293b",color:"#f1f5f9",border:"1px solid #334155",fontWeight:600,fontSize:14}}>Cancel</button>
          <button onClick={()=>handleDelete(modals.deleteConfirm)} style={{flex:1,padding:12,borderRadius:12,background:"#dc2626",color:"#fff",border:"none",fontWeight:700,fontSize:14}}>Delete</button>
        </div>
      </Modal>

      {/* Add/Edit Expense Modal */}
      <Modal show={modals.add} title={editId?"Edit Expense":"Add Expense"} onClose={()=>{closeModal("add");setEditId(null);setForm(blankForm);}}>
        <Input label="TITLE" icon="📝" type="text" placeholder="What did you spend on?" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
        <Input label="AMOUNT (₹)" icon="💰" type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
        <Input label="DATE" icon="📅" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:"#64748b",fontWeight:700,display:"block",marginBottom:8,letterSpacing:0.5}}>CATEGORY</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {CATEGORIES.map(c=>(
              <button key={c} onClick={()=>setForm(f=>({...f,category:c}))}
                style={{padding:"8px 4px",borderRadius:10,border:`1.5px solid ${form.category===c?CAT_COLOR[c]:"#1e293b"}`,
                  background:form.category===c?CAT_COLOR[c]+"22":"#0f172a",
                  color:form.category===c?CAT_COLOR[c]:"#475569",fontSize:10,fontWeight:600,
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <span style={{fontSize:15}}>{CAT_ICON[c]}</span>{c}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:"#64748b",fontWeight:700,display:"block",marginBottom:8,letterSpacing:0.5}}>PAYMENT METHOD</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
            {UPI_APPS.map(u=>(
              <button key={u.id} onClick={()=>setForm(f=>({...f,paymentMethod:u.id}))}
                style={{padding:"8px 4px",borderRadius:10,border:`1.5px solid ${form.paymentMethod===u.id?u.color:"#1e293b"}`,
                  background:form.paymentMethod===u.id?u.color+"22":"#0f172a",
                  color:form.paymentMethod===u.id?u.color:"#475569",fontSize:9,fontWeight:700,
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <span style={{width:24,height:24,borderRadius:7,background:form.paymentMethod===u.id?u.color:"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:800}}>{u.icon}</span>
                {u.short}
              </button>
            ))}
          </div>
        </div>

        <Input label="NOTE (optional)" icon="🗒️" type="text" placeholder="Add a note..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
        <Input label="TAGS (optional)" icon="🏷️" type="text" placeholder="e.g. work, family, fun" value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))}/>

        <button onClick={handleSave} style={{width:"100%",padding:15,borderRadius:14,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",fontSize:16,fontWeight:800,marginTop:6}}>
          {editId?"Update Expense ✏️":"Add Expense 💰"}
        </button>
      </Modal>

      {/* Savings Goal Modal */}
      <Modal show={modals.goal} title={editGoalId?"Edit Goal":"New Savings Goal"} onClose={()=>{closeModal("goal");setEditGoalId(null);setGoalForm(blankGoal);}}>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:"#64748b",fontWeight:700,display:"block",marginBottom:8,letterSpacing:0.5}}>ICON</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {["🎯","🏠","✈️","🚗","💻","📱","💍","🎓","🏖️","💰","🛍️","🏋️"].map(ic=>(
              <button key={ic} onClick={()=>setGoalForm(f=>({...f,icon:ic}))}
                style={{width:40,height:40,borderRadius:10,border:`1.5px solid ${goalForm.icon===ic?"#6366f1":"#1e293b"}`,background:goalForm.icon===ic?"#6366f122":"#0f172a",fontSize:20}}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <Input label="GOAL NAME" icon="🎯" type="text" placeholder="e.g. New Phone, Vacation..." value={goalForm.name} onChange={e=>setGoalForm(f=>({...f,name:e.target.value}))}/>
        <Input label="TARGET AMOUNT (₹)" icon="💰" type="number" placeholder="50000" value={goalForm.target} onChange={e=>setGoalForm(f=>({...f,target:e.target.value}))}/>
        <Input label="ALREADY SAVED (₹)" icon="💵" type="number" placeholder="0" value={goalForm.saved} onChange={e=>setGoalForm(f=>({...f,saved:e.target.value}))}/>
        <Input label="DEADLINE (optional)" icon="📅" type="date" value={goalForm.deadline} onChange={e=>setGoalForm(f=>({...f,deadline:e.target.value}))}/>
        <button onClick={handleSaveGoal} style={{width:"100%",padding:15,borderRadius:14,background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",fontSize:16,fontWeight:800}}>
          {editGoalId?"Update Goal":"Create Goal 🎯"}
        </button>
      </Modal>

      {/* Recurring Modal */}
      <Modal show={modals.recurring} title="Add Recurring Expense" onClose={()=>{closeModal("recurring");setRecurForm(blankRecur);}}>
        <Input label="TITLE" icon="🔄" type="text" placeholder="e.g. Netflix, Rent..." value={recurForm.title} onChange={e=>setRecurForm(f=>({...f,title:e.target.value}))}/>
        <Input label="AMOUNT (₹)" icon="💰" type="number" placeholder="0.00" value={recurForm.amount} onChange={e=>setRecurForm(f=>({...f,amount:e.target.value}))}/>
        <Select label="CATEGORY" icon={CAT_ICON[recurForm.category]} value={recurForm.category} onChange={e=>setRecurForm(f=>({...f,category:e.target.value}))}>
          {CATEGORIES.map(c=><option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
        </Select>
        <Select label="FREQUENCY" icon="📆" value={recurForm.frequency} onChange={e=>setRecurForm(f=>({...f,frequency:e.target.value}))}>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </Select>
        <Select label="PAYMENT METHOD" icon="💳" value={recurForm.paymentMethod} onChange={e=>setRecurForm(f=>({...f,paymentMethod:e.target.value}))}>
          {UPI_APPS.map(u=><option key={u.id} value={u.id}>{u.icon} {u.name}</option>)}
        </Select>
        <Input label="NEXT DUE DATE" icon="📅" type="date" value={recurForm.nextDate} onChange={e=>setRecurForm(f=>({...f,nextDate:e.target.value}))}/>
        <button onClick={handleSaveRecur} style={{width:"100%",padding:15,borderRadius:14,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",border:"none",fontSize:16,fontWeight:800}}>
          Save Recurring 🔄
        </button>
      </Modal>

      {/* Income Modal */}
      <Modal show={modals.income} title={editIncomeId?"Edit Income":"Add Income"} onClose={()=>{closeModal("income");setEditIncomeId(null);setIncomeForm(blankIncome);}}>
        <Input label="TITLE" icon="💵" type="text" placeholder="e.g. Monthly Salary, Freelance Project..." value={incomeForm.title} onChange={e=>setIncomeForm(f=>({...f,title:e.target.value}))}/>
        <Input label="AMOUNT (₹)" icon="💰" type="number" placeholder="0.00" value={incomeForm.amount} onChange={e=>setIncomeForm(f=>({...f,amount:e.target.value}))}/>
        <Input label="DATE" icon="📅" type="date" value={incomeForm.date} onChange={e=>setIncomeForm(f=>({...f,date:e.target.value}))}/>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:"#64748b",fontWeight:700,display:"block",marginBottom:8,letterSpacing:0.5}}>SOURCE</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {INCOME_CATEGORIES.map(c=>(
              <button key={c} onClick={()=>setIncomeForm(f=>({...f,category:c}))}
                style={{padding:"8px 4px",borderRadius:10,border:`1.5px solid ${incomeForm.category===c?"#10b981":"#1e293b"}`,
                  background:incomeForm.category===c?"#10b98122":"#0f172a",
                  color:incomeForm.category===c?"#10b981":"#475569",fontSize:9,fontWeight:600,
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <span style={{fontSize:15}}>{INCOME_ICON[c]}</span>{c}
              </button>
            ))}
          </div>
        </div>
        <Input label="NOTE (optional)" icon="🗒️" type="text" placeholder="Add a note..." value={incomeForm.note} onChange={e=>setIncomeForm(f=>({...f,note:e.target.value}))}/>
        <button onClick={handleSaveIncome} style={{width:"100%",padding:15,borderRadius:14,background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",fontSize:16,fontWeight:800,marginTop:6}}>
          {editIncomeId?"Update Income ✏️":"Add Income 💵"}
        </button>
      </Modal>

      {/* Income delete confirm */}
      <Modal show={!!modals.deleteIncomeConfirm} title="Delete Income?" onClose={()=>setModals(m=>({...m,deleteIncomeConfirm:null}))}>
        <p style={{color:"#94a3b8",marginBottom:20,fontSize:14}}>This cannot be undone.</p>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setModals(m=>({...m,deleteIncomeConfirm:null}))} style={{flex:1,padding:12,borderRadius:12,background:"#1e293b",color:"#f1f5f9",border:"1px solid #334155",fontWeight:600,fontSize:14}}>Cancel</button>
          <button onClick={()=>handleDeleteIncome(modals.deleteIncomeConfirm)} style={{flex:1,padding:12,borderRadius:12,background:"#dc2626",color:"#fff",border:"none",fontWeight:700,fontSize:14}}>Delete</button>
        </div>
      </Modal>

      {/* Category Budgets Modal */}
      <Modal show={modals.catBudget} title="Category Budgets" onClose={()=>closeModal("catBudget")}>
        <p style={{color:"#64748b",fontSize:12,marginBottom:16}}>Set a monthly spending limit per category. Leave blank for no limit.</p>
        {CATEGORIES.map(c=>(
          <div key={c} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{width:32,height:32,borderRadius:9,background:CAT_COLOR[c]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{CAT_ICON[c]}</span>
            <span style={{fontSize:13,fontWeight:600,flex:1}}>{c}</span>
            <input type="number" placeholder="No limit" value={catBudgetDraft[c]||""}
              onChange={e=>setCatBudgetDraft(d=>({...d,[c]:e.target.value}))}
              style={{width:110,padding:"8px 10px",borderRadius:9,background:"#020617",border:"1px solid #334155",color:"#f1f5f9",fontSize:13,textAlign:"right"}}/>
          </div>
        ))}
        <button onClick={saveCatBudgets} style={{width:"100%",padding:15,borderRadius:14,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",fontSize:16,fontWeight:800,marginTop:10}}>
          Save Category Budgets 🎯
        </button>
      </Modal>

      {/* ── HEADER ── */}
      <div style={{background:"#0f172a",borderBottom:"1px solid #1e293b",padding:"14px 18px",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:640,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:17,fontWeight:900,letterSpacing:-0.5}}>
              <span style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>💸 ExpenseAI</span>
            </div>
            <div style={{fontSize:10,color:"#475569",fontWeight:600,letterSpacing:0.5}}>SMART BUDGET TRACKER</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {data.profile.name&&<div style={{fontSize:13,fontWeight:700,color:"#94a3b8"}}>Hi, {data.profile.name.split(" ")[0]}!</div>}
            <button onClick={()=>openModal("add")}
              style={{width:38,height:38,borderRadius:12,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px #6366f155"}}>
              +
            </button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:640,margin:"0 auto",padding:"0 14px"}}>

        {/* ══ DASHBOARD ══════════════════════════════════════════════════════════ */}
        {tab==="dashboard"&&(
          <div style={{animation:"fadeIn 0.3s ease",paddingTop:16}}>

            {/* Budget Hero */}
            <div style={{background:"linear-gradient(135deg,#0f172a,#1a1040)",border:"1px solid #312e81",borderRadius:22,padding:20,marginBottom:14,display:"flex",alignItems:"center",gap:18}}>
              <BudgetRing pct={budgetPct}/>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"#818cf8",fontWeight:700,letterSpacing:0.5,marginBottom:4}}>THIS MONTH</div>
                <div style={{fontSize:28,fontWeight:900,letterSpacing:-1,color: budgetPct>0.9?"#ef4444":"#f1f5f9"}}>{fmt(currSpent,cur)}</div>
                <div style={{fontSize:13,fontWeight:600,marginTop:4,color:remaining>=0?"#10b981":"#ef4444"}}>
                  {remaining>=0?`✅ ${fmt(remaining,cur)} left`:`⚠️ Over by ${fmt(Math.abs(remaining),cur)}`}
                </div>
                {budgetPct>=alertPct&&budgetPct<1&&<div style={{fontSize:11,color:"#f59e0b",marginTop:6,animation:"pulse 2s infinite"}}>⚡ Approaching budget limit!</div>}
                {budgetPct>=1&&<div style={{fontSize:11,color:"#ef4444",marginTop:6,animation:"pulse 2s infinite"}}>🚨 Budget exceeded!</div>}
              </div>
            </div>

            {/* Income vs Expense */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:"14px 16px"}}>
                <div style={{fontSize:10,color:"#10b981",fontWeight:700,letterSpacing:0.5,marginBottom:6}}>💵 INCOME</div>
                <div style={{fontSize:18,fontWeight:800,color:"#10b981"}}>{fmt(currIncome,cur)}</div>
                <button onClick={()=>openModal("income")} style={{marginTop:8,width:"100%",padding:"6px",borderRadius:8,background:"#10b98122",border:"1px solid #10b98144",color:"#10b981",fontSize:11,fontWeight:700}}>+ Add Income</button>
              </div>
              <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:"14px 16px"}}>
                <div style={{fontSize:10,color:netSavings>=0?"#6366f1":"#ef4444",fontWeight:700,letterSpacing:0.5,marginBottom:6}}>📈 NET SAVINGS</div>
                <div style={{fontSize:18,fontWeight:800,color:netSavings>=0?"#6366f1":"#ef4444"}}>{netSavings>=0?"":"−"}{fmt(Math.abs(netSavings),cur)}</div>
                <div style={{marginTop:8,fontSize:11,color:"#475569"}}>{currIncome>0?`${Math.round((netSavings/currIncome)*100)}% of income saved`:"Add income to see %"}</div>
              </div>
            </div>

            {/* Spending Prediction */}
            {dayOfMonth>=3&&currSpent>0&&(
              <div style={{background:projectedOverBudget?"#1a0a00":"#06160f",border:`1px solid ${projectedOverBudget?"#92400e":"#065f46"}`,borderRadius:16,padding:16,marginBottom:14,display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:28}}>{projectedOverBudget?"⚠️":"🔮"}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:projectedOverBudget?"#f59e0b":"#10b981"}}>
                    Projected month-end: {fmt(projectedSpend,cur)}
                  </div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                    {projectedOverBudget
                      ? `At this pace you'll exceed your ${fmt(data.budget,cur)} budget by ${fmt(projectedSpend-data.budget,cur)}`
                      : `On track to stay within your ${fmt(data.budget,cur)} budget`}
                  </div>
                </div>
              </div>
            )}

            {/* Category Budgets */}
            {categoryBudgetStatus.length>0&&(
              <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:18,padding:18,marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:0.5}}>CATEGORY BUDGETS</span>
                  <button onClick={openCatBudgetModal} style={{fontSize:11,color:"#6366f1",background:"none",border:"none",fontWeight:700}}>Edit →</button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {categoryBudgetStatus.map(c=>(
                    <div key={c.category}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:600}}>{CAT_ICON[c.category]} {c.category}</span>
                        <span style={{fontSize:11,fontWeight:700,color:c.pct>=1?"#ef4444":c.pct>=0.8?"#f59e0b":"#94a3b8"}}>{fmt(c.spent,cur)} / {fmt(c.limit,cur)}</span>
                      </div>
                      <div style={{height:6,borderRadius:3,background:"#1e293b",overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:3,background:c.pct>=1?"#ef4444":c.pct>=0.8?"#f59e0b":CAT_COLOR[c.category],width:`${Math.min(c.pct*100,100)}%`,transition:"width 0.5s ease"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {categoryBudgetStatus.length===0&&(
              <button onClick={openCatBudgetModal} style={{width:"100%",padding:14,borderRadius:16,background:"#0f172a",border:"1px dashed #334155",color:"#64748b",fontSize:12,fontWeight:600,marginBottom:14}}>
                🎯 Set category-wise budgets (Food, Bills, etc.)
              </button>
            )}

            {/* Quick stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
              {[
                {label:"Transactions",value:currExp.length,icon:"📊",color:"#6366f1"},
                {label:"Daily Avg",value:fmt(currSpent/Math.max(new Date().getDate(),1),cur),icon:"📅",color:"#10b981"},
                {label:"Top Spend",value:catBreakdown[0]?.label||"—",icon:catBreakdown[0]?CAT_ICON[catBreakdown[0].label]:"📦",color:"#f59e0b"},
              ].map((s,i)=>(
                <div key={i} style={{background:"#0f172a",border:`1px solid #1e293b`,borderRadius:14,padding:"14px 10px",textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:5}}>{s.icon}</div>
                  <div style={{fontSize:12,fontWeight:800,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:10,color:"#475569",marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* UPI Usage */}
            {payBreakdown.length>0&&(
              <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:18,padding:18,marginBottom:14}}>
                <div style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:0.5,marginBottom:12}}>PAYMENT METHODS THIS MONTH</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {payBreakdown.map(p=>{
                    const app=UPI_APPS.find(u=>u.label===p.label||u.short===p.label);
                    return (
                      <div key={p.label} style={{display:"flex",alignItems:"center",gap:10}}>
                        <UPIBadge id={UPI_APPS.find(u=>u.short===p.label)?.id||""} size={28}/>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:12,fontWeight:600}}>{p.label}</span>
                            <span style={{fontSize:12,fontWeight:800,color:p.color}}>{fmt(p.v,cur)}</span>
                          </div>
                          <div style={{height:5,borderRadius:3,background:"#1e293b",overflow:"hidden"}}>
                            <div style={{height:"100%",borderRadius:3,background:p.color,width:`${(p.v/filtSpent)*100}%`,transition:"width 0.5s ease"}}/>
                          </div>
                        </div>
                        <span style={{fontSize:11,color:"#64748b",minWidth:30}}>{Math.round(p.v/filtSpent*100)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category donut */}
            {catBreakdown.length>0&&(
              <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:18,padding:18,marginBottom:14}}>
                <div style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:0.5,marginBottom:14}}>SPENDING BY CATEGORY</div>
                <div style={{display:"flex",alignItems:"center",gap:18}}>
                  <div style={{position:"relative",flexShrink:0}}>
                    <DonutChart segs={catBreakdown.map(c=>({v:c.v,c:c.color}))}/>
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
                      <span style={{fontSize:10,color:"#64748b"}}>total</span>
                      <span style={{fontSize:11,fontWeight:800,color:"#f1f5f9"}}>{fmt(filtSpent,cur)}</span>
                    </div>
                  </div>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:7}}>
                    {catBreakdown.slice(0,5).map(c=>(
                      <div key={c.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                          <span style={{fontSize:11,color:"#94a3b8"}}>{CAT_ICON[c.label]} {c.label}</span>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:"#f1f5f9"}}>{fmt(c.v,cur)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6-month trend */}
            <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:18,padding:18,marginBottom:14}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:0.5,marginBottom:12}}>6-MONTH TREND</div>
              <SparkBar data={monthTrend} highlight={nowMonth()}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                <span style={{fontSize:11,color:"#475569"}}>Avg: {fmt(monthTrend.reduce((a,m)=>a+m.v,0)/6,cur)}/mo</span>
                <span style={{fontSize:11,color:"#6366f1",fontWeight:700}}>This month ↑</span>
              </div>
            </div>

            {/* Recurring due */}
            {data.recurringExpenses.filter(r=>r.nextDate<=todayStr()).length>0&&(
              <div style={{background:"#1a0a00",border:"1px solid #92400e",borderRadius:18,padding:16,marginBottom:14}}>
                <div style={{fontSize:11,color:"#f59e0b",fontWeight:700,marginBottom:10,letterSpacing:0.5}}>🔄 RECURRING DUE TODAY</div>
                {data.recurringExpenses.filter(r=>r.nextDate<=todayStr()).map(r=>(
                  <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700}}>{r.title}</div>
                      <div style={{fontSize:11,color:"#92400e"}}>{fmt(r.amount,cur)} · {r.frequency}</div>
                    </div>
                    <button onClick={()=>payRecurring(r)} style={{padding:"7px 14px",borderRadius:10,background:"#f59e0b",color:"#000",border:"none",fontSize:12,fontWeight:700}}>Pay ✓</button>
                  </div>
                ))}
              </div>
            )}

            {/* Recent expenses */}
            {currExp.length>0&&(
              <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:18,padding:18,marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:0.5}}>RECENT EXPENSES</div>
                  <button onClick={()=>setTab("history")} style={{fontSize:11,color:"#6366f1",background:"none",border:"none",fontWeight:700}}>See all →</button>
                </div>
                {currExp.slice(0,5).map(e=>(
                  <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #0f172a"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:38,height:38,borderRadius:11,background:CAT_COLOR[e.category]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{CAT_ICON[e.category]}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700}}>{e.title}</div>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                          <UPIBadge id={e.paymentMethod} size={14}/>
                          <span style={{fontSize:10,color:"#475569"}}>{UPI_APPS.find(u=>u.id===e.paymentMethod)?.short} · {fmtDate(e.date)}</span>
                        </div>
                      </div>
                    </div>
                    <span style={{fontSize:14,fontWeight:800,color:"#f97316"}}>−{fmt(e.amount,cur)}</span>
                  </div>
                ))}
              </div>
            )}

            {currExp.length===0&&(
              <div style={{textAlign:"center",padding:"50px 20px",color:"#475569"}}>
                <div style={{fontSize:48,marginBottom:12}}>📭</div>
                <div style={{fontSize:15,fontWeight:700,color:"#64748b"}}>No expenses this month</div>
                <div style={{fontSize:13,marginTop:4}}>Tap + to add your first one!</div>
              </div>
            )}
          </div>
        )}

        {/* ══ HISTORY ════════════════════════════════════════════════════════════ */}
        {tab==="history"&&(
          <div style={{animation:"fadeIn 0.3s ease",paddingTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:18,fontWeight:800}}>📋 History</span>
              <button onClick={exportCSV} style={{padding:"7px 14px",borderRadius:10,background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",fontSize:12,fontWeight:600}}>📥 Export CSV</button>
            </div>

            {/* Sub-tab toggle */}
            <div style={{display:"flex",gap:6,marginBottom:14,background:"#0f172a",borderRadius:12,padding:4,border:"1px solid #1e293b"}}>
              <button onClick={()=>setHistorySubTab("expenses")} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",fontSize:13,fontWeight:700,
                background:historySubTab==="expenses"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",color:historySubTab==="expenses"?"#fff":"#64748b"}}>
                💸 Expenses
              </button>
              <button onClick={()=>setHistorySubTab("income")} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",fontSize:13,fontWeight:700,
                background:historySubTab==="income"?"linear-gradient(135deg,#10b981,#059669)":"transparent",color:historySubTab==="income"?"#fff":"#64748b"}}>
                💵 Income
              </button>
            </div>

            {/* Filters */}
            <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{padding:"8px 12px",borderRadius:10,background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",fontSize:12,flex:1}}>
                {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              {historySubTab==="expenses"&&(<>
                <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{padding:"8px 12px",borderRadius:10,background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",fontSize:12,flex:1}}>
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c=><option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
                </select>
                <select value={filterPay} onChange={e=>setFilterPay(e.target.value)} style={{padding:"8px 12px",borderRadius:10,background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",fontSize:12,flex:1}}>
                  <option value="All">All Payments</option>
                  {UPI_APPS.map(u=><option key={u.id} value={u.id}>{u.icon} {u.short}</option>)}
                </select>
              </>)}
            </div>
            <div style={{position:"relative",marginBottom:12}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={historySubTab==="expenses"?"Search expenses...":"Search income..."}
                style={{width:"100%",padding:"10px 12px 10px 36px",borderRadius:12,background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",fontSize:13}}/>
            </div>

            {/* ── EXPENSES SUB-TAB ── */}
            {historySubTab==="expenses"&&(<>
              {filteredExp.length>0&&(
                <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:"12px 16px",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,color:"#64748b"}}>{filteredExp.length} transactions</span>
                  <span style={{fontSize:13,fontWeight:800,color:"#f97316"}}>{fmt(filtSpent,cur)}</span>
                </div>
              )}

              {filteredExp.length===0&&<div style={{textAlign:"center",padding:"50px 20px",color:"#475569"}}><div style={{fontSize:40}}>🔍</div><div style={{marginTop:10,color:"#64748b",fontWeight:600}}>No expenses found</div></div>}

              {filteredExp.map(e=>(
                <div key={e.id} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:"14px 16px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
                      <div style={{width:42,height:42,borderRadius:12,background:CAT_COLOR[e.category]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{CAT_ICON[e.category]}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</div>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3,flexWrap:"wrap"}}>
                          <UPIBadge id={e.paymentMethod} size={16}/>
                          <span style={{fontSize:10,color:"#475569"}}>{UPI_APPS.find(u=>u.id===e.paymentMethod)?.short}</span>
                          <span style={{fontSize:10,color:"#334155"}}>·</span>
                          <span style={{fontSize:10,color:"#475569"}}>{fmtDate(e.date)}</span>
                          <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:CAT_COLOR[e.category]+"22",color:CAT_COLOR[e.category],fontWeight:600}}>{e.category}</span>
                        </div>
                        {e.note&&<div style={{fontSize:11,color:"#475569",marginTop:3}}>📝 {e.note}</div>}
                        {e.tags&&<div style={{fontSize:10,color:"#6366f1",marginTop:2}}>🏷️ {e.tags}</div>}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                      <div style={{fontSize:15,fontWeight:800,color:"#f97316"}}>−{fmt(e.amount,cur)}</div>
                      <div style={{display:"flex",gap:5,marginTop:6,justifyContent:"flex-end"}}>
                        <button onClick={()=>handleEdit(e)} style={{padding:"4px 8px",borderRadius:7,background:"#1e293b",border:"1px solid #334155",color:"#818cf8",fontSize:11}}>✏️</button>
                        <button onClick={()=>setModals(m=>({...m,deleteConfirm:e.id}))} style={{padding:"4px 8px",borderRadius:7,background:"#1e293b",border:"1px solid #334155",color:"#ef4444",fontSize:11}}>🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>)}

            {/* ── INCOME SUB-TAB ── */}
            {historySubTab==="income"&&(<>
              <button onClick={()=>openModal("income")} style={{width:"100%",padding:12,borderRadius:12,background:"linear-gradient(135deg,#10b981,#059669)",border:"none",color:"#fff",fontSize:13,fontWeight:700,marginBottom:12}}>+ Add Income</button>

              {filteredIncomes.length>0&&(
                <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:"12px 16px",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,color:"#64748b"}}>{filteredIncomes.length} income entries</span>
                  <span style={{fontSize:13,fontWeight:800,color:"#10b981"}}>{fmt(filtIncomeTotal,cur)}</span>
                </div>
              )}

              {filteredIncomes.length===0&&<div style={{textAlign:"center",padding:"50px 20px",color:"#475569"}}><div style={{fontSize:40}}>💵</div><div style={{marginTop:10,color:"#64748b",fontWeight:600}}>No income recorded</div></div>}

              {filteredIncomes.map(e=>(
                <div key={e.id} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:"14px 16px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
                      <div style={{width:42,height:42,borderRadius:12,background:"#10b98122",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{INCOME_ICON[e.category]}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</div>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3,flexWrap:"wrap"}}>
                          <span style={{fontSize:10,color:"#475569"}}>{fmtDate(e.date)}</span>
                          <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:"#10b98122",color:"#10b981",fontWeight:600}}>{e.category}</span>
                        </div>
                        {e.note&&<div style={{fontSize:11,color:"#475569",marginTop:3}}>📝 {e.note}</div>}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                      <div style={{fontSize:15,fontWeight:800,color:"#10b981"}}>+{fmt(e.amount,cur)}</div>
                      <div style={{display:"flex",gap:5,marginTop:6,justifyContent:"flex-end"}}>
                        <button onClick={()=>handleEditIncome(e)} style={{padding:"4px 8px",borderRadius:7,background:"#1e293b",border:"1px solid #334155",color:"#818cf8",fontSize:11}}>✏️</button>
                        <button onClick={()=>setModals(m=>({...m,deleteIncomeConfirm:e.id}))} style={{padding:"4px 8px",borderRadius:7,background:"#1e293b",border:"1px solid #334155",color:"#ef4444",fontSize:11}}>🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>)}
          </div>
        )}

        {/* ══ GOALS ══════════════════════════════════════════════════════════════ */}
        {tab==="goals"&&(
          <div style={{animation:"fadeIn 0.3s ease",paddingTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <span style={{fontSize:18,fontWeight:800}}>🎯 Goals & Recurring</span>
            </div>

            {/* Savings Goals */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:700,color:"#94a3b8"}}>SAVINGS GOALS</span>
              <button onClick={()=>openModal("goal")} style={{padding:"7px 14px",borderRadius:10,background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",fontSize:12,fontWeight:700}}>+ New Goal</button>
            </div>

            {data.savingsGoals.length===0&&(
              <div style={{background:"#0f172a",border:"1px dashed #334155",borderRadius:16,padding:"28px 20px",textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:36,marginBottom:8}}>🎯</div>
                <div style={{color:"#64748b",fontSize:13,fontWeight:600}}>No savings goals yet</div>
                <div style={{color:"#475569",fontSize:12,marginTop:4}}>Set a goal to track your savings progress!</div>
              </div>
            )}

            {data.savingsGoals.map(g=>{
              const pct=Math.min(g.saved/g.target,1);
              const daysLeft=g.deadline?Math.ceil((new Date(g.deadline)-new Date())/86400000):null;
              return (
                <div key={g.id} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:18,marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{fontSize:28}}>{g.icon}</span>
                      <div>
                        <div style={{fontSize:14,fontWeight:800}}>{g.name}</div>
                        {daysLeft!==null&&<div style={{fontSize:11,color:daysLeft<7?"#ef4444":"#64748b",marginTop:2}}>{daysLeft>0?`${daysLeft} days left`:"Deadline passed!"}</div>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setGoalForm({...g,target:String(g.target),saved:String(g.saved)});setEditGoalId(g.id);openModal("goal");}} style={{padding:"4px 8px",borderRadius:7,background:"#1e293b",border:"1px solid #334155",color:"#818cf8",fontSize:11}}>✏️</button>
                      <button onClick={()=>deleteGoal(g.id)} style={{padding:"4px 8px",borderRadius:7,background:"#1e293b",border:"1px solid #334155",color:"#ef4444",fontSize:11}}>🗑️</button>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
                    <span style={{color:"#64748b"}}>Saved: <b style={{color:"#10b981"}}>{fmt(g.saved,cur)}</b></span>
                    <span style={{color:"#64748b"}}>Target: <b style={{color:"#f1f5f9"}}>{fmt(g.target,cur)}</b></span>
                  </div>
                  <div style={{height:8,borderRadius:4,background:"#1e293b",overflow:"hidden",marginBottom:10}}>
                    <div style={{height:"100%",borderRadius:4,background:pct>=1?"#10b981":"linear-gradient(90deg,#6366f1,#8b5cf6)",width:`${pct*100}%`,transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,color:pct>=1?"#10b981":"#6366f1",fontWeight:700}}>{pct>=1?"🎉 Goal Reached!":Math.round(pct*100)+"% complete"}</span>
                    {pct<1&&(
                      <div style={{display:"flex",gap:6}}>
                        {[500,1000,2000].map(amt=>(
                          <button key={amt} onClick={()=>addToGoal(g.id,amt)} style={{padding:"5px 10px",borderRadius:8,background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",fontSize:11,fontWeight:600}}>+{fmt(amt,cur)}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Recurring */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"20px 0 10px"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#94a3b8"}}>RECURRING EXPENSES</span>
              <button onClick={()=>openModal("recurring")} style={{padding:"7px 14px",borderRadius:10,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",border:"none",fontSize:12,fontWeight:700}}>+ Add Recurring</button>
            </div>

            {data.recurringExpenses.length===0&&(
              <div style={{background:"#0f172a",border:"1px dashed #334155",borderRadius:16,padding:"28px 20px",textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:8}}>🔄</div>
                <div style={{color:"#64748b",fontSize:13,fontWeight:600}}>No recurring expenses</div>
                <div style={{color:"#475569",fontSize:12,marginTop:4}}>Add subscriptions, EMIs, rent, etc.</div>
              </div>
            )}

            {data.recurringExpenses.map(r=>{
              const isDue=r.nextDate<=todayStr();
              return (
                <div key={r.id} style={{background:isDue?"#1a1000":"#0f172a",border:`1px solid ${isDue?"#92400e":"#1e293b"}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{width:38,height:38,borderRadius:11,background:CAT_COLOR[r.category]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{CAT_ICON[r.category]}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700}}>{r.title}</div>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                          <UPIBadge id={r.paymentMethod} size={14}/>
                          <span style={{fontSize:10,color:"#475569"}}>{r.frequency} · Next: {fmtDate(r.nextDate)}</span>
                        </div>
                        {isDue&&<span style={{fontSize:10,color:"#f59e0b",fontWeight:700,animation:"pulse 2s infinite"}}>⚡ DUE TODAY</span>}
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:14,fontWeight:800,color:"#f97316"}}>−{fmt(r.amount,cur)}</div>
                      <div style={{display:"flex",gap:5,marginTop:6,justifyContent:"flex-end"}}>
                        {isDue&&<button onClick={()=>payRecurring(r)} style={{padding:"4px 8px",borderRadius:7,background:"#f59e0b",border:"none",color:"#000",fontSize:10,fontWeight:700}}>Pay</button>}
                        <button onClick={()=>deleteRecur(r.id)} style={{padding:"4px 8px",borderRadius:7,background:"#1e293b",border:"1px solid #334155",color:"#ef4444",fontSize:11}}>🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ AI ADVISOR ═════════════════════════════════════════════════════════ */}
        {tab==="ai"&&(
          <div style={{animation:"fadeIn 0.3s ease",paddingTop:16}}>
            <div style={{marginBottom:4}}>
              <span style={{fontSize:18,fontWeight:800}}>🤖 AI Financial Advisor</span>
            </div>
            <div style={{fontSize:11,color:"#475569",marginBottom:14}}>Powered by Claude AI · Knows your spending patterns</div>

            <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:18,padding:16,marginBottom:12}}>
              <AIChat messages={aiMsgs} loading={aiLoading}/>
            </div>

            {/* Quick prompts */}
            <div style={{display:"flex",gap:7,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
              {["Analyze my spending 📊","Am I on budget? 💰","Save money tips 💡","Reduce my bills 📉","Rate my finances ⭐","Best payment app? 📱"].map(q=>(
                <button key={q} onClick={()=>setAiInput(q)} style={{padding:"8px 14px",borderRadius:20,background:"#0f172a",border:"1px solid #334155",color:"#94a3b8",fontSize:11,whiteSpace:"nowrap",fontWeight:600}}>
                  {q}
                </button>
              ))}
            </div>

            <div style={{display:"flex",gap:8}}>
              <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendAI()}
                placeholder="Ask about your finances..." disabled={aiLoading}
                style={{flex:1,padding:"13px 16px",borderRadius:14,background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",fontSize:14}}/>
              <button onClick={sendAI} disabled={aiLoading||!aiInput.trim()}
                style={{padding:"13px 18px",borderRadius:14,border:"none",color:"#fff",fontSize:18,
                  background:aiLoading||!aiInput.trim()?"#1e293b":"linear-gradient(135deg,#6366f1,#8b5cf6)",
                  transition:"all 0.2s"}}>➤</button>
            </div>
          </div>
        )}

        {/* ══ PROFILE ════════════════════════════════════════════════════════════ */}
        {tab==="profile"&&(
          <div style={{animation:"fadeIn 0.3s ease",paddingTop:16}}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:16}}>👤 My Profile</div>

            {/* Avatar + Name */}
            <div style={{background:"linear-gradient(135deg,#0f172a,#1a1040)",border:"1px solid #312e81",borderRadius:20,padding:24,marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:56,marginBottom:8}}>{data.profile.avatar||"😊"}</div>
              <div style={{fontSize:18,fontWeight:800,color:"#f1f5f9"}}>{data.profile.name||"Your Name"}</div>
              {data.profile.upiId&&<div style={{fontSize:12,color:"#818cf8",marginTop:4}}>📱 {data.profile.upiId}</div>}
              {data.profile.email&&<div style={{fontSize:12,color:"#64748b",marginTop:2}}>✉️ {data.profile.email}</div>}
              <div style={{marginTop:14,display:"flex",justifyContent:"center",gap:16}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:800,color:"#6366f1"}}>{data.expenses.length}</div>
                  <div style={{fontSize:10,color:"#64748b"}}>Total Expenses</div>
                </div>
                <div style={{width:1,background:"#1e293b"}}/>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:800,color:"#10b981"}}>{fmt(data.expenses.reduce((a,e)=>a+e.amount,0),cur)}</div>
                  <div style={{fontSize:10,color:"#64748b"}}>Total Tracked</div>
                </div>
                <div style={{width:1,background:"#1e293b"}}/>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:800,color:"#f59e0b"}}>{data.savingsGoals.length}</div>
                  <div style={{fontSize:10,color:"#64748b"}}>Goals</div>
                </div>
              </div>
            </div>

            {/* Avatar picker */}
            <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:10,letterSpacing:0.5}}>CHOOSE AVATAR</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {AVATARS.map(av=>(
                  <button key={av} onClick={()=>setData(d=>({...d,profile:{...d.profile,avatar:av}}))}
                    style={{width:44,height:44,borderRadius:12,border:`2px solid ${data.profile.avatar===av?"#6366f1":"#1e293b"}`,background:data.profile.avatar===av?"#6366f122":"#020617",fontSize:24}}>
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Personal Info */}
            <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:12,letterSpacing:0.5}}>PERSONAL INFO</div>
              <Input label="FULL NAME" icon="👤" type="text" placeholder="Your name" value={data.profile.name} onChange={e=>setData(d=>({...d,profile:{...d.profile,name:e.target.value}}))}/>
              <Input label="PHONE" icon="📱" type="tel" placeholder="+91 98765 43210" value={data.profile.phone} onChange={e=>setData(d=>({...d,profile:{...d.profile,phone:e.target.value}}))}/>
              <Input label="EMAIL" icon="✉️" type="email" placeholder="you@email.com" value={data.profile.email} onChange={e=>setData(d=>({...d,profile:{...d.profile,email:e.target.value}}))}/>
            </div>

            {/* UPI IDs */}
            <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:12,letterSpacing:0.5}}>YOUR UPI IDs</div>
              {UPI_APPS.slice(0,6).map(u=>(
                <div key={u.id} style={{marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                    <span style={{width:22,height:22,borderRadius:6,background:u.color,display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>{u.icon}</span>
                    <label style={{fontSize:11,color:"#64748b",fontWeight:700}}>{u.name.toUpperCase()} UPI ID</label>
                  </div>
                  <input type="text" placeholder={`yourname@${u.id}`}
                    value={data.profile[`upi_${u.id}`]||""}
                    onChange={e=>setData(d=>({...d,profile:{...d.profile,[`upi_${u.id}`]:e.target.value}}))}
                    style={{width:"100%",padding:"10px 14px",borderRadius:10,background:"#020617",border:"1px solid #334155",color:"#f1f5f9",fontSize:13}}/>
                </div>
              ))}
            </div>

            {/* Budget Settings */}
            <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:12,letterSpacing:0.5}}>BUDGET SETTINGS</div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,color:"#64748b",fontWeight:700,display:"block",marginBottom:5}}>MONTHLY BUDGET</label>
                <input type="number" value={data.budget} onChange={e=>setData(d=>({...d,budget:Number(e.target.value)||5000}))}
                  style={{width:"100%",padding:"12px 14px",borderRadius:12,background:"#020617",border:"1px solid #334155",color:"#f1f5f9",fontSize:16,fontWeight:700}}/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,color:"#64748b",fontWeight:700,display:"block",marginBottom:5}}>ALERT WHEN BUDGET IS {data.profile.budgetAlert||80}% USED</label>
                <input type="range" min={50} max={95} step={5} value={data.profile.budgetAlert||80}
                  onChange={e=>setData(d=>({...d,profile:{...d.profile,budgetAlert:Number(e.target.value)}}))}
                  style={{width:"100%",accentColor:"#6366f1"}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569",marginTop:4}}>
                  <span>50%</span><span style={{color:"#6366f1",fontWeight:700}}>{data.profile.budgetAlert||80}%</span><span>95%</span>
                </div>
              </div>
              <div>
                <label style={{fontSize:11,color:"#64748b",fontWeight:700,display:"block",marginBottom:5}}>CURRENCY SYMBOL</label>
                <select value={data.profile.currency||"₹"} onChange={e=>setData(d=>({...d,profile:{...d.profile,currency:e.target.value}}))}
                  style={{width:"100%",padding:"11px 14px",borderRadius:12,background:"#020617",border:"1px solid #334155",color:"#f1f5f9",fontSize:14}}>
                  {["₹","$","€","£","¥","AED"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Danger zone */}
            <div style={{background:"#1a0000",border:"1px solid #7f1d1d",borderRadius:16,padding:16,marginBottom:20}}>
              <div style={{fontSize:11,color:"#ef4444",fontWeight:700,marginBottom:10,letterSpacing:0.5}}>⚠️ DANGER ZONE</div>
              <button onClick={()=>{if(confirm("Delete ALL expenses? This cannot be undone!"))setData(d=>({...d,expenses:[]}));showToast("All expenses deleted.","info");}}
                style={{width:"100%",padding:12,borderRadius:12,background:"transparent",border:"1px solid #7f1d1d",color:"#ef4444",fontWeight:700,fontSize:13,marginBottom:8}}>
                🗑️ Delete All Expenses
              </button>
              <button onClick={()=>{if(confirm("Reset EVERYTHING? This cannot be undone!"))setData(loadData());showToast("Data reset.","info");}}
                style={{width:"100%",padding:12,borderRadius:12,background:"transparent",border:"1px solid #7f1d1d",color:"#ef4444",fontWeight:700,fontSize:13}}>
                ♻️ Reset All Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0f172a",borderTop:"1px solid #1e293b",display:"flex",justifyContent:"space-around",padding:"10px 0 18px",zIndex:100}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",
              color:tab===t.key?"#6366f1":"#334155",padding:"0 12px",transition:"color 0.2s"}}>
            <div style={{fontSize:21,filter:tab===t.key?"none":"grayscale(1) opacity(0.4)",transition:"filter 0.2s"}}>{t.icon}</div>
            <span style={{fontSize:9,fontWeight:tab===t.key?800:500,letterSpacing:0.3}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}