import { useState, useEffect, useRef } from "react";
import { API_URL } from "../config/api";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  date: string;
  listId: string;
}

interface TodoList {
  id: string;
  name: string;
  emoji: string;
  color: string;
  dateBound: boolean; 
}

const LIST_COLORS = ["#10b981","#6366f1","#f59e0b","#ef4444","#3b82f6","#ec4899","#8b5cf6","#14b8a6"];
const LIST_EMOJIS = ["📝","💼","🏃","🎯","🏠","📚","💡","🎨","🛒","💰","🌟","🔥","⭐","🧘","✈️","🎵"];

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const DEFAULT_LIST: TodoList = { id: "personal", name: "Personal", emoji: "📝", color: "#10b981", dateBound: true };
const GLOBAL_DATE = "____global____"; 

function getDayOffset(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function dateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

const today = dateKey(new Date());

export default function TodayPage() {
  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [selectedDate, setSelectedDate] = useState(today);
  const [allTodos,     setAllTodos]     = useState<Todo[]>([]);
  const [lists,         setLists]        = useState<TodoList[]>([DEFAULT_LIST]);
  const [activeList,    setActiveList]   = useState("personal");
  const [todoInput,     setTodoInput]    = useState("");
  const [note,          setNote]         = useState("");
  const [loading,       setLoading]      = useState(true);
  const [saving,        setSaving]       = useState(false);

  const [showNewList,    setShowNewList]   = useState(false);
  const [editListId,     setEditListId]    = useState<string | null>(null);
  const [newListName,    setNewListName]   = useState("");
  const [newListEmoji,   setNewListEmoji]  = useState("📝");
  const [newListColor,   setNewListColor]  = useState("#10b981");
  const [newListGlobal,  setNewListGlobal] = useState(false);
  const [showListMenu,   setShowListMenu]  = useState<string | null>(null);
  
  // Track menu position
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const weekDays = Array.from({ length: 7 }, (_, i) => getDayOffset(i - 3));

useEffect(() => {
  const load = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/today`, { headers });
      const data = await res.json();
      const raw: Array<Todo | string> = data.todos || [];
      const migrated: Todo[] = raw.map((t, i) =>
        typeof t === "string"
          ? { id: Date.now() + i, text: t, completed: false, date: today, listId: "personal" }
          : { listId: "personal", date: today, ...t }
      );
      setAllTodos(migrated);
      setNote(data.notes || "");
      
      // Load lists from MongoDB instead of localStorage
      if (data.lists && data.lists.length > 0) {
        setLists(data.lists);
      } else {
        setLists([DEFAULT_LIST]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  load();
}, []);

const save = async (todos: Todo[], n = note, l = lists) => {
  setSaving(true);
  try {
    await fetch(`${API_URL}/api/today`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ todos, notes: n, lists: l }),
    });
  } catch (e) { console.error(e); }
  finally { setSaving(false); }
};

const saveLists = async (updatedLists: TodoList[]) => {
  setLists(updatedLists);
  await save(allTodos, note, updatedLists);
};

  const currentList = lists.find(l => l.id === activeList) || lists[0];
  const effectiveDate = currentList?.dateBound === false ? GLOBAL_DATE : selectedDate;
  const todosForView = allTodos.filter(t => t.listId === activeList && t.date === effectiveDate);
  const pending      = todosForView.filter(t => !t.completed);
  const done         = todosForView.filter(t => t.completed);

  const getDayStats = (key: string) => {
    const dt = allTodos.filter(t => t.date === key && lists.find(l => l.id === t.listId)?.dateBound !== false);
    return { total: dt.length, done: dt.filter(t => t.completed).length };
  };

  const dateTodos   = allTodos.filter(t => t.date === selectedDate && lists.find(l => l.id === t.listId)?.dateBound !== false);
  const dateDone    = dateTodos.filter(t => t.completed).length;
  const datePct     = dateTodos.length > 0 ? Math.round((dateDone / dateTodos.length) * 100) : 0;

  const addTodo = () => {
    if (!todoInput.trim()) return;
    const newTodo: Todo = {
      id: Date.now(),
      text: todoInput.trim(),
      completed: false,
      date: effectiveDate,
      listId: activeList,
    };
    const updated = [...allTodos, newTodo];
    setAllTodos(updated);
    setTodoInput("");
    save(updated);
    inputRef.current?.focus();
  };

  const toggleTodo = (id: number) => {
    const updated = allTodos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setAllTodos(updated);
    save(updated);
  };

  const deleteTodo = (id: number) => {
    const updated = allTodos.filter(t => t.id !== id);
    setAllTodos(updated);
    save(updated);
  };

  const updateNote = async (val: string) => {
    setNote(val);
    save(allTodos, val);
  };

  const openNewList = () => {
    setEditListId(null);
    setNewListName("");
    setNewListEmoji("📝");
    setNewListColor("#10b981");
    setNewListGlobal(false);
    setShowNewList(true);
  };

  const openEditList = (list: TodoList) => {
    setEditListId(list.id);
    setNewListName(list.name);
    setNewListEmoji(list.emoji);
    setNewListColor(list.color);
    setNewListGlobal(list.dateBound === false);
    setShowNewList(true);
    setShowListMenu(null);
  };

  const submitList = () => {
    if (!newListName.trim()) return;
    if (editListId) {
      saveLists(lists.map(l => l.id === editListId
        ? { ...l, name: newListName.trim(), emoji: newListEmoji, color: newListColor, dateBound: !newListGlobal }
        : l
      ));
    } else {
      const id = `list_${Date.now()}`;
      saveLists([...lists, { id, name: newListName.trim(), emoji: newListEmoji, color: newListColor, dateBound: !newListGlobal }]);
      setActiveList(id);
    }
    setShowNewList(false);
    setEditListId(null);
    setNewListName("");
  };

  const deleteList = (id: string) => {
    if (id === "personal") return; 
    const updated = lists.filter(l => l.id !== id);
    saveLists(updated);
    if (activeList === id) setActiveList(updated[0]?.id || "personal");
    setShowListMenu(null);
  };

  // Helper to trigger menu and position it
  const handleMenuTrigger = (e: React.MouseEvent, listId: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 5, left: rect.left - 100 });
    setShowListMenu(showListMenu === listId ? null : listId);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#04040a] flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-full bg-[#04040a] text-slate-200 pb-10">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Today</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {saving && <span className="text-[9px] text-slate-600 uppercase tracking-widest animate-pulse">Saving...</span>}
      </div>

      {/* Week strip */}
      <div className="px-4 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {weekDays.map((d, i) => {
            const key = dateKey(d);
            const isToday = key === today;
            const isSel = key === selectedDate;
            const { total, done: dd } = getDayStats(key);
            return (
              <button key={i} onClick={() => setSelectedDate(key)}
                className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl min-w-[52px] cursor-pointer border transition-all shrink-0 ${
                  isSel ? "bg-emerald-500 border-emerald-500 text-white" : isToday ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-[#0d0d1a] border-white/[0.06] text-slate-400 hover:border-white/20"
                }`}
              >
                <span className="text-[9px] font-black uppercase tracking-wide">{DAYS[d.getDay()]}</span>
                <span className="text-lg font-black leading-none">{d.getDate()}</span>
                <span className={`text-[8px] font-bold ${isSel ? "text-white/60" : "text-slate-600"}`}>{MONTHS[d.getMonth()]}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${total === 0 ? "bg-transparent" : dd === total ? "bg-emerald-400" : isSel ? "bg-white/50" : "bg-slate-600"}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Day progress */}
      {dateTodos.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {selectedDate === today ? "Today's Progress" : new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <span className={`text-[11px] font-black ${datePct === 100 ? "text-emerald-400" : "text-slate-400"}`}>
                    {dateDone}/{dateTodos.length} {datePct === 100 && "🔥"}
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${datePct}%`, background: datePct === 100 ? "#10b981" : datePct >= 60 ? "#f59e0b" : "#6366f1" }} />
                </div>
              </div>

              {/* Pie/Donut Chart */}
              <div className="flex items-center gap-3.5 shrink-0 self-center sm:self-auto border-t sm:border-t-0 sm:border-l border-white/[0.04] pt-3 sm:pt-0 sm:pl-4">
                <div 
                  className="w-12 h-12 rounded-full relative flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.3)] transition-all duration-700"
                  style={{
                    background: `conic-gradient(#10b981 0% ${datePct}%, #27273a ${datePct}% 100%)`
                  }}
                >
                  <div className="w-8.5 h-8.5 rounded-full bg-[#0d0d1a] flex items-center justify-center text-[9px] font-black text-white">
                    {datePct}%
                  </div>
                </div>
                <div className="text-[9px] leading-relaxed space-y-0.5 text-slate-500 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span className="text-slate-400">Done ({dateDone})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#27273a]" />
                    <span>Pending ({dateTodos.length - dateDone})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {lists.map(list => {
            const viewDate = list.dateBound === false ? GLOBAL_DATE : selectedDate;
            const count = allTodos.filter(t => t.listId === list.id && t.date === viewDate && !t.completed).length;
            const isActive = activeList === list.id;
            return (
              <div key={list.id} className="relative shrink-0">
                <button
                  onClick={() => setActiveList(list.id)}
                  className={`flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-xl text-xs font-black cursor-pointer border transition-all`}
                  style={isActive ? { background: list.color + "20", borderColor: list.color + "50", color: list.color } : { background: "rgba(13,13,26,1)", borderColor: "rgba(255,255,255,0.06)", color: "#64748b" }}
                >
                  <span>{list.emoji}</span>
                  <span>{list.name}</span>
                  {!list.dateBound && <span className="text-[8px] opacity-60">∞</span>}
                  {count > 0 && (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ml-0.5"
                      style={{ background: isActive ? list.color : "#334155" }}>{count}</span>
                  )}
                  <span onClick={(e) => handleMenuTrigger(e, list.id)}
                    className="ml-0.5 text-[10px] opacity-40 hover:opacity-100 cursor-pointer px-0.5">⋯</span>
                </button>
              </div>
            );
          })}
          <button onClick={openNewList}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer border border-dashed border-white/[0.12] text-slate-600 hover:text-slate-400 transition-all shrink-0 bg-transparent whitespace-nowrap">+ New List</button>
        </div>
      </div>

      {/* FLOATING MENU (BREAKS OUT OF OVERFLOW) */}
      {showListMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowListMenu(null)} />
          <div className="fixed z-[9999] w-36 bg-[#1a1a2e] border border-white/[0.12] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] overflow-hidden"
               style={{ top: menuPos.top, left: menuPos.left }}>
            <button onClick={() => { const list = lists.find(l => l.id === showListMenu); if(list) openEditList(list); }}
              className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/[0.06] cursor-pointer border-none bg-transparent">✏️ Edit</button>
            {showListMenu !== "personal" && (
              <button onClick={() => deleteList(showListMenu)}
                className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 cursor-pointer border-none bg-transparent">🗑️ Delete</button>
            )}
          </div>
        </>
      )}

      {/* New / Edit list form */}
      {showNewList && (
        <div className="px-4 mb-4">
          <div className="bg-[#0d0d1a] border border-white/[0.1] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-white">{editListId ? "Edit List" : "New List"}</p>
              <button onClick={() => { setShowNewList(false); setEditListId(null); }}
                className="text-slate-500 hover:text-white cursor-pointer border-none bg-transparent text-xl leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10">×</button>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {LIST_EMOJIS.map(e => (
                <button key={e} onClick={() => setNewListEmoji(e)}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center cursor-pointer border-none transition-all ${newListEmoji === e ? "bg-white/20 scale-110" : "bg-white/[0.04] hover:bg-white/10"}`}>{e}</button>
              ))}
            </div>
            <input autoFocus className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-sm outline-none focus:border-emerald-500/40 transition-colors mb-3" placeholder="List name..." value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === "Enter" && submitList()} />
            <div className="flex gap-2 mb-3 flex-wrap">
              {LIST_COLORS.map(c => (
                <div key={c} onClick={() => setNewListColor(c)} className="w-6 h-6 rounded-lg cursor-pointer transition-all" style={{ background: c, outline: newListColor === c ? `2px solid ${c}` : "none", outlineOffset: "2px", transform: newListColor === c ? "scale(1.2)" : "scale(1)" }} />
              ))}
            </div>
            <div onClick={() => setNewListGlobal(!newListGlobal)} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4 cursor-pointer hover:bg-white/[0.05] transition-colors">
              <div><p className="text-xs font-black text-white">Same tasks every day</p><p className="text-[10px] text-slate-500 mt-0.5">Tasks won't change when you switch dates</p></div>
              <div className={`w-10 h-5 rounded-full transition-all relative ${newListGlobal ? "bg-emerald-500" : "bg-white/10"}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${newListGlobal ? "left-5" : "left-0.5"}`} /></div>
            </div>
            <button onClick={submitList} disabled={!newListName.trim()} className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer border-none transition-all disabled:bg-slate-800 disabled:text-slate-600 text-white" style={{ background: newListName.trim() ? newListColor : undefined }}>{editListId ? "Save Changes" : `Create ${newListEmoji} ${newListName || "List"}`}</button>
          </div>
        </div>
      )}

      {/* Todo card */}
      <div className="px-4 mb-4">
        <div className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-white/[0.04]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: (currentList?.color || "#10b981") + "20" }}>{currentList?.emoji || "📝"}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">{currentList?.name}</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-widest">{currentList?.dateBound === false ? "∞ global list — same every day" : todosForView.length === 0 ? "No tasks" : `${done.length}/${todosForView.length} done`}</p>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2 max-h-[45vh] overflow-y-auto">
            {todosForView.length === 0 ? (
              <div className="text-center py-8"><div className="text-3xl mb-2 opacity-20">{currentList?.emoji || "📋"}</div><p className="text-xs text-slate-600">{currentList?.dateBound === false ? "No tasks in this list yet." : selectedDate === today ? "No tasks yet. Add one below!" : "No tasks for this day."}</p></div>
            ) : (
              <>
                {pending.map(todo => (
                  <div key={todo.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] group">
                    <button onClick={() => toggleTodo(todo.id)} className="w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-110" style={{ borderColor: (currentList?.color || "#10b981") + "70" }} />
                    <span className="flex-1 text-sm text-slate-200 break-words">{todo.text}</span>
                    <button onClick={() => deleteTodo(todo.id)} className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                  </div>
                ))}
                {done.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 pt-2 pb-1"><div className="flex-1 h-px bg-white/[0.04]" /><span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Done ({done.length})</span><div className="flex-1 h-px bg-white/[0.04]" /></div>
                    {done.map(todo => (
                      <div key={todo.id} className="flex items-center gap-3 p-2.5 rounded-xl opacity-40 group">
                        <button onClick={() => toggleTodo(todo.id)} className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 cursor-pointer" style={{ background: currentList?.color || "#10b981" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></button>
                        <span className="flex-1 text-sm text-slate-500 line-through break-words">{todo.text}</span>
                        <button onClick={() => deleteTodo(todo.id)} className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
          <div className="px-4 pb-4 pt-2 border-t border-white/[0.04]">
            <div className="flex gap-2">
              <input ref={inputRef} className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-200 text-sm outline-none transition-colors" placeholder={`Add to ${currentList?.name || "list"}...`} value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} />
              <button onClick={addTodo} disabled={!todoInput.trim()} className="px-4 py-2.5 text-white text-sm font-black rounded-xl cursor-pointer border-none disabled:bg-slate-800 disabled:text-slate-600" style={{ background: todoInput.trim() ? (currentList?.color || "#10b981") : undefined }}>Add</button>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder / Notes */}
      <div className="px-4">
        <div className="bg-[#0d0d1a] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-white/[0.04] flex items-center gap-2"><span className="text-base">📌</span><div><p className="text-sm font-black text-white">Reminder / Notes</p><p className="text-[9px] text-slate-600 uppercase tracking-widest">Saved automatically</p></div></div>
          <textarea className="w-full bg-transparent px-4 py-3 text-sm text-slate-300 outline-none resize-none placeholder:text-slate-600 min-h-[140px]" placeholder="Write your reminders..." value={note} onChange={e => updateNote(e.target.value)} />
        </div>
      </div>
    </div>
  );
}