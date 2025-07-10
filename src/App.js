import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Check, X, Calendar, MessageSquare, Send } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';

// --- Componente para el Modal de Comentarios ---
const CommentsModal = ({ taskId, onClose }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  // Cargar comentarios en tiempo real (onSnapshot es ideal para esto aquí)
  useEffect(() => {
    const commentsRef = collection(db, 'tasks', taskId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const commentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(commentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [taskId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (newComment.trim() === '') return;

    const commentsRef = collection(db, 'tasks', taskId, 'comments');
    await addDoc(commentsRef, {
      text: newComment,
      createdAt: Timestamp.now(),
      // author: "ID_DEL_USUARIO" // Futura mejora: añadir autor del comentario
    });
    setNewComment('');
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg mx-4 flex flex-col h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold mb-4 text-white">Comentarios</h3>
        
        <div className="flex-grow overflow-y-auto pr-2">
          {loading && <p className="text-gray-400">Cargando comentarios...</p>}
          {!loading && comments.length === 0 && (
            <p className="text-gray-500 text-center mt-8">No hay comentarios todavía. ¡Sé el primero!</p>
          )}
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="bg-gray-700 p-3 rounded-md">
                <p className="text-gray-300 break-words">{comment.text}</p>
                <p className="text-xs text-gray-500 text-right mt-2">
                  {formatDate(comment.createdAt, true)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleAddComment} className="mt-4 flex items-center space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario..."
            className="flex-grow bg-gray-600 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 p-2 rounded-md hover:bg-blue-500 transition-colors">
            <Send size={20} className="text-white" />
          </button>
        </form>
      </div>
    </div>
  );
};


// Componente para el encabezado
const Header = () => (
  <header className="bg-gray-900 text-white p-4 shadow-md">
    <h1 className="text-2xl font-bold text-center">Taysync</h1>
  </header>
);

// Función para formatear fechas de Firestore
const formatDate = (timestamp, includeTime = false) => {
  if (!timestamp) return null;
  const date = timestamp.toDate();
  const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit' };
  
  if (includeTime) {
    return date.toLocaleDateString('es-ES', {...dateOptions, ...timeOptions});
  }
  return date.toLocaleDateString('es-ES', dateOptions);
};

// Componente para una sola tarjeta de tarea
const TaskCard = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(task.text);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(task.deliveryDate ? task.deliveryDate.toDate().toISOString().split('T')[0] : '');
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const handleUpdateStatus = (newStatus) => onUpdate(task.id, { status: newStatus });
  const handleSaveText = () => {
    if (editedText.trim()) {
      onUpdate(task.id, { text: editedText });
      setIsEditing(false);
    }
  };
  const handleSaveDate = () => {
    const newDate = deliveryDate ? Timestamp.fromDate(new Date(deliveryDate)) : null;
    onUpdate(task.id, { deliveryDate: newDate });
    setIsEditingDate(false);
  };

  return (
    <>
      {isCommentsOpen && <CommentsModal taskId={task.id} onClose={() => setIsCommentsOpen(false)} />}

      <div className="bg-gray-800 p-4 rounded-lg shadow-sm mb-3 flex flex-col justify-between min-h-[180px]">
        {isEditing ? (
          <div className="flex flex-col">
            <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} className="bg-gray-700 text-white p-2 rounded-md mb-2 w-full" rows="3" autoFocus />
            <div className="flex justify-end space-x-2">
              <button onClick={handleSaveText} className="p-1 text-green-400 hover:text-green-300"><Check size={18} /></button>
              <button onClick={() => setIsEditing(false)} className="p-1 text-red-400 hover:text-red-300"><X size={18} /></button>
            </div>
          </div>
        ) : (
          <p className="text-gray-300 mb-3 break-words flex-grow">{task.text}</p>
        )}

        {!isEditing && (
          <div className="text-xs text-gray-400 mt-auto space-y-2">
            <div className="flex items-center justify-between"><span>Asignado:</span><span>{formatDate(task.assignmentDate)}</span></div>
            <div className="flex items-center justify-between">
              <span>Entrega:</span>
              {isEditingDate ? (
                <div className="flex items-center space-x-2">
                  <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="bg-gray-700 text-white p-1 rounded-md text-xs" />
                  <button onClick={handleSaveDate} className="p-1 text-green-400"><Check size={14} /></button>
                  <button onClick={() => setIsEditingDate(false)} className="p-1 text-red-400"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{formatDate(task.deliveryDate) || 'Sin fecha'}</span>
                  <button onClick={() => setIsEditingDate(true)} className="text-gray-400 hover:text-white"><Calendar size={14} /></button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {!isEditing && (
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
            <div className="flex space-x-2 items-center">
              <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-white"><Edit size={16} /></button>
              <button onClick={() => onDelete(task.id)} className="p-1 text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
              <button onClick={() => setIsCommentsOpen(true)} className="p-1 text-gray-400 hover:text-white"><MessageSquare size={16} /></button>
            </div>
            <div className="flex space-x-1">
              {task.status !== 'pending' && <button onClick={() => handleUpdateStatus('pending')} className="text-xs bg-gray-600 hover:bg-gray-500 text-white py-1 px-2 rounded-full">P</button>}
              {task.status !== 'in-progress' && <button onClick={() => handleUpdateStatus('in-progress')} className="text-xs bg-blue-600 hover:bg-blue-500 text-white py-1 px-2 rounded-full">EP</button>}
              {task.status !== 'completed' && <button onClick={() => handleUpdateStatus('completed')} className="text-xs bg-green-600 hover:bg-green-500 text-white py-1 px-2 rounded-full">C</button>}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Componente para una columna del tablero
const TaskColumn = ({ title, tasks, status, onUpdate, onDelete }) => {
  const columnStyles = { pending: "bg-red-900/50", 'in-progress': "bg-blue-900/50", completed: "bg-green-900/50" };
  return (
    <div className={`p-4 rounded-xl ${columnStyles[status]}`}>
      <h2 className="text-xl font-semibold mb-4 text-white text-center">{title} ({tasks.length})</h2>
      <div className="space-y-3">
        {tasks.map(task => <TaskCard key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />)}
      </div>
    </div>
  );
};

// Componente para el formulario de nueva tarea
const NewTaskForm = ({ onAddTask }) => {
  const [taskText, setTaskText] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (taskText.trim()) {
      onAddTask(taskText);
      setTaskText('');
    }
  };
  return (
    <form onSubmit={handleSubmit} className="p-4 mb-6 bg-gray-800 rounded-lg shadow-md flex items-center space-x-4">
      <input type="text" value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="Añadir nueva tarea..." className="flex-grow bg-gray-700 text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button type="submit" className="bg-blue-600 text-white p-3 rounded-md hover:bg-blue-500 transition-colors flex items-center space-x-2"><Plus size={20} /><span>Añadir</span></button>
    </form>
  );
};

// Componente principal de la aplicación
function App() {
  const [tasks, setTasks] = useState([]);

  const fetchTasks = async () => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const tasksData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTasks(tasksData);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddTask = async (text) => {
    try {
      const newTask = {
        text: text,
        status: 'pending',
        createdAt: Timestamp.now(),
        assignmentDate: Timestamp.now(),
        deliveryDate: null,
      };
      const docRef = await addDoc(collection(db, "tasks"), newTask);
      setTasks([{ id: docRef.id, ...newTask }, ...tasks]);
    } catch (e) { console.error("Error adding document: ", e); }
  };

  const handleUpdateTask = async (id, updates) => {
    const taskDoc = doc(db, "tasks", id);
    await updateDoc(taskDoc, updates);
    const updatedTasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, ...updates };
        }
        return task;
    });
    setTasks(updatedTasks);
  };

  const handleDeleteTask = async (id) => {
    await deleteDoc(doc(db, "tasks", id));
    setTasks(tasks.filter(task => task.id !== id));
  };
  
  const filterTasksByStatus = (status) => tasks.filter(task => task.status === status);

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans">
      <Header />
      <main className="p-8">
        <NewTaskForm onAddTask={handleAddTask} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <TaskColumn title="Pendiente" tasks={filterTasksByStatus('pending')} status="pending" onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
          <TaskColumn title="En Progreso" tasks={filterTasksByStatus('in-progress')} status="in-progress" onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
          <TaskColumn title="Completado" tasks={filterTasksByStatus('completed')} status="completed" onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
        </div>
      </main>
    </div>
  );
}

export default App;