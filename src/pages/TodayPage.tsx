import { useState, useEffect } from "react";
import {
  Editor,
  EditorProvider,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnNumberedList,
  BtnBulletList
} from "react-simple-wysiwyg";
import { API_URL } from "../config/api";

function TodayPage() {

  const [todos,setTodos] = useState<string[]>([]);
  const [todoInput,setTodoInput] = useState("");
  const [note,setNote] = useState("");

  // FETCH DATA FROM BACKEND
  const fetchToday = async () => {

    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/today`,{
      headers:{
        Authorization:`Bearer ${token}`
      }
    });

    const data = await res.json();

    setTodos(data.todos || []);
    setNote(data.notes || "");
  };

  useEffect(()=>{
    fetchToday();
  },[]);

  // SAVE DATA TO BACKEND
  const saveToday = async (newTodos:string[], newNote:string)=>{

    const token = localStorage.getItem("token");

    await fetch(`${API_URL}/api/today`,{
      method:"PUT",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`
      },
      body:JSON.stringify({
        todos:newTodos,
        notes:newNote
      })
    });

  };

  // ADD TODO
  const addTodo = () => {

    if(!todoInput) return;

    const updated = [...todos,todoInput];

    setTodos(updated);
    setTodoInput("");

    saveToday(updated,note);
  };

  // DELETE TODO
  const deleteTodo = (index:number)=>{

    const updated=[...todos];
    updated.splice(index,1);

    setTodos(updated);

    saveToday(updated,note);
  };

  // UPDATE NOTE
  const updateNote = (value:string)=>{

    setNote(value);

    saveToday(todos,value);
  };

  return (

    <div className="p-6">

      <h1 className="text-2xl font-semibold mb-6">
        Today
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* TODO LIST */}
        <div className="bg-white p-4 rounded-lg shadow">

          <h2 className="text-lg font-semibold mb-3">
            Todo
          </h2>

          <div className="space-y-2 mb-4">

            {todos.map((todo,index)=>(
              <div
                key={index}
                className="flex justify-between items-center border p-2 rounded"
              >

                <span>{todo}</span>

                <button
                  onClick={()=>deleteTodo(index)}
                  className="text-red-500 text-sm"
                >
                  Delete
                </button>

              </div>
            ))}

          </div>

          <div className="flex gap-2">

            <input
              className="border p-2 flex-1 rounded"
              placeholder="New task"
              value={todoInput}
              onChange={(e)=>setTodoInput(e.target.value)}
            />

            <button
              onClick={addTodo}
              className="bg-slate-800 text-white px-4 rounded"
            >
              Add
            </button>

          </div>

        </div>


        {/* NOTES EDITOR */}
        <div className="bg-white p-4 rounded-lg shadow">

          <h2 className="text-lg font-semibold mb-3">
            Reminder
          </h2>

          <EditorProvider>

            <Toolbar>
              <BtnBold />
              <BtnItalic />
              <BtnUnderline />
              <BtnNumberedList />
              <BtnBulletList />
            </Toolbar>

            <Editor
              value={note}
              onChange={(e)=>updateNote(e.target.value)}
              containerProps={{
                style:{minHeight:"300px"}
              }}
            />

          </EditorProvider>

        </div>

      </div>

    </div>

  );
}

export default TodayPage;