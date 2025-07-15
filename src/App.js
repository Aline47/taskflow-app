import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    doc, 
    serverTimestamp,
    query,
    deleteDoc,
    setDoc,
    Timestamp
} from 'firebase/firestore';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { Plus, User, LogIn, LogOut, Loader2, Users, Trash2, ShieldCheck, UserCheck, UserPlus, X, Eye, EyeOff, RefreshCw, Calendar, MessageSquare, Send, Check, AlertTriangle, Edit, BarChart2, Sun, Moon, Search, Filter } from 'lucide-react';

// --- Configuración de Firebase ---
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG 
    ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) 
    : {};
const appId = process.env.REACT_APP_ID || 'default-task-app';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Funciones de Utilidad ---
const formatDate = (timestamp, includeTime = false) => {
    if (!timestamp) return 'Sin fecha';
    const date = timestamp.toDate();
    const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('es-ES', includeTime ? {...dateOptions, ...timeOptions} : dateOptions);
};

const getInitials = (name = '') => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

const avatarColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
    'bg-pink-500', 'bg-rose-500'
];

const getColorForName = (name = '') => {
    const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return avatarColors[charCodeSum % avatarColors.length];
};

// --- Componentes Visuales ---
const UserAvatar = ({ name, size = 'md' }) => {
    const initials = getInitials(name);
    const color = getColorForName(name);
    const sizeClasses = {
        'sm': 'w-6 h-6 text-xs',
        'md': 'w-8 h-8 text-sm',
        'lg': 'w-10 h-10 text-base'
    };

    return (
        <div className={`flex-shrink-0 flex items-center justify-center rounded-full text-white font-bold ${color} ${sizeClasses[size]}`}>
            {initials}
        </div>
    );
};

const AppLogo = () => (
    <div className="flex items-center gap-2">
        <RefreshCw className="w-8 h-8 text-indigo-600" />
        <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">Taysync</span>
    </div>
);

const TeamworkIllustration = () => (
    <svg width="100%" height="100%" viewBox="0 0 200 150" className="w-48 h-48 mx-auto text-indigo-500 mb-4">
        <rect x="10" y="50" width="180" height="90" rx="10" fill="none" stroke="currentColor" strokeWidth="2"/>
        <path d="M10 70 H 190" stroke="currentColor" strokeWidth="1" strokeDasharray="4"/>
        <circle cx="50" cy="30" r="10" fill="currentColor" /><path d="M40 45 C 40 55, 60 55, 60 45" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="100" cy="30" r="10" fill="currentColor" /><path d="M90 45 C 90 55, 110 55, 110 45" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="150" cy="30" r="10" fill="currentColor" /><path d="M140 45 C 140 55, 160 55, 160 45" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M30 85 h 60" stroke="currentColor" strokeWidth="2" /><path d="M30 105 h 80" stroke="currentColor" strokeWidth="2" /><path d="M30 125 h 50" stroke="currentColor" strokeWidth="2" />
        <path d="M130 85 h 40" stroke="currentColor" strokeWidth="2" /><path d="M130 105 h 30" stroke="currentColor" strokeWidth="2" />
    </svg>
);

// --- Componentes de la Interfaz ---

const CommentsModal = ({ taskId, onClose, currentUser }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/tasks/${taskId}/comments`);
  
    useEffect(() => {
      const q = query(commentsCollectionRef);
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const commentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            commentsData.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
            setComments(commentsData);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error al cargar comentarios: ", err);
            setError("No se pudieron cargar los comentarios. Revisa las reglas de seguridad de Firestore.");
            setLoading(false);
        });
      return () => unsubscribe();
    }, [taskId, commentsCollectionRef]);
  
    const handleAddComment = async (e) => {
      e.preventDefault();
      if (newComment.trim() === '') return;
      try {
        await addDoc(commentsCollectionRef, { text: newComment, authorName: currentUser.name, authorId: currentUser.uid, createdAt: serverTimestamp() });
        setNewComment('');
      } catch (err) {
        console.error("Error al añadir comentario: ", err);
        setError("No se pudo enviar el comentario.");
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg flex flex-col h-[70vh]" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Comentarios</h3>
          <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4">
            {loading && <p className="text-gray-500 dark:text-gray-400">Cargando...</p>}
            {error && <div className="text-red-600 bg-red-100 p-3 rounded-md flex items-center gap-2"><AlertTriangle size={20}/><span>{error}</span></div>}
            {!loading && !error && comments.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center mt-8">No hay comentarios.</p>}
            {!loading && !error && comments.map(comment => (
              <div key={comment.id} className="flex items-start gap-3 bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                <UserAvatar name={comment.authorName} size="sm" />
                <div className="flex-1">
                    <p className="font-semibold text-sm text-indigo-700 dark:text-indigo-400">{comment.authorName}</p>
                    <p className="text-gray-700 dark:text-gray-300 break-words">{comment.text}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">{formatDate(comment.createdAt, true)}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="mt-4 flex items-center space-x-2">
            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." className="flex-grow p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" className="bg-indigo-600 p-2 rounded-md hover:bg-indigo-700 transition-colors"><Send size={20} className="text-white" /></button>
          </form>
        </div>
      </div>
    );
};

const TaskCard = ({ task, onUpdateTask, onDeleteTask, currentUser, allUsers, isReadOnly = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [editedDescription, setEditedDescription] = useState(task.description);
    const [editedPriority, setEditedPriority] = useState(task.priority);

    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [newDeliveryDate, setNewDeliveryDate] = useState(task.deliveryDate ? task.deliveryDate.toDate().toISOString().split('T')[0] : '');
    const [isEditingAssignee, setIsEditingAssignee] = useState(false);
    const [newAssignee, setNewAssignee] = useState(task.assignedTo);

    const statusColors = {
        'Pendiente': 'bg-blue-100 text-blue-800 border-l-blue-500 dark:bg-blue-900/50 dark:text-blue-200',
        'En Progreso': 'bg-yellow-100 text-yellow-800 border-l-yellow-500 dark:bg-yellow-900/50 dark:text-yellow-200',
        'Completada': 'bg-green-100 text-green-800 border-l-green-500 dark:bg-green-900/50 dark:text-green-200',
    };
    const priorityColors = {
        'Baja': 'bg-gray-200 text-gray-800',
        'Media': 'bg-blue-200 text-blue-800',
        'Alta': 'bg-red-200 text-red-800',
    };

    const handleSave = () => {
        onUpdateTask(task.id, { title: editedTitle, description: editedDescription, priority: editedPriority });
        setIsEditing(false);
    };

    const canDelete = currentUser.role === 'Coordinador' && !isReadOnly;
    const canUpdate = (currentUser.role === 'Coordinador' || currentUser.name === task.assignedTo) && !isReadOnly;
    const canChangeAssignee = currentUser.role === 'Coordinador' && !isReadOnly;
    const canEditTask = currentUser.role === 'Coordinador' && !isReadOnly;

    return (
        <>
            {isCommentsOpen && <CommentsModal taskId={task.id} onClose={() => setIsCommentsOpen(false)} currentUser={currentUser} />}
            <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4 transition-transform hover:scale-105 border-l-4 ${statusColors[task.status]}`}>
                {isEditing ? (
                    <div className="space-y-2">
                        <input type="text" value={editedTitle} onChange={e => setEditedTitle(e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-gray-700 dark:border-gray-600" />
                        <textarea value={editedDescription} onChange={e => setEditedDescription(e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-gray-700 dark:border-gray-600" rows="2"></textarea>
                        <select value={editedPriority} onChange={e => setEditedPriority(e.target.value)} className="w-full p-1 border rounded bg-white dark:bg-gray-700 dark:border-gray-600">
                            <option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option>
                        </select>
                        <div className="flex justify-end gap-2"><button onClick={() => setIsEditing(false)} className="text-red-500"><X size={18}/></button><button onClick={handleSave} className="text-green-500"><Check size={18}/></button></div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-800 dark:text-gray-100 flex-1">{task.title}</h4>
                            {canEditTask && <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-indigo-600 ml-2"><Edit size={14}/></button>}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 my-2">{task.description}</p>
                    </>
                )}
                
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 space-y-1">
                    <div className="flex justify-between items-center">
                        <span>Prioridad:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColors[task.priority]}`}>{task.priority}</span>
                    </div>
                    <div className="flex justify-between"><span>Asignado:</span> <span>{formatDate(task.assignmentDate)}</span></div>
                    <div className="flex justify-between items-center">
                        <span>Entrega:</span>
                        {isEditingDate && canUpdate ? (
                            <div className="flex items-center gap-1"><input type="date" value={newDeliveryDate} onChange={(e) => setNewDeliveryDate(e.target.value)} className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-1 rounded text-xs"/><button onClick={() => {onUpdateTask(task.id, { deliveryDate: newDeliveryDate ? Timestamp.fromDate(new Date(newDeliveryDate)) : null }); setIsEditingDate(false);}} className="text-green-500"><Check size={16}/></button><button onClick={() => setIsEditingDate(false)} className="text-red-500"><X size={16}/></button></div>
                        ) : (
                            <div className="flex items-center gap-2"><span>{formatDate(task.deliveryDate)}</span>{canUpdate && <button onClick={() => setIsEditingDate(true)}><Calendar size={14}/></button>}</div>
                        )}
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center flex-grow min-w-0">
                            {isEditingAssignee && canChangeAssignee ? (
                                <div className="flex items-center gap-1 w-full"><select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className="flex-grow p-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 min-w-0">{allUsers.map(user => <option key={user.uid} value={user.name}>{user.name}</option>)}</select><button onClick={() => {onUpdateTask(task.id, { assignedTo: newAssignee }); setIsEditingAssignee(false);}} className="text-green-500 p-1 flex-shrink-0"><Check size={16}/></button><button onClick={() => setIsEditingAssignee(false)} className="text-red-500 p-1 flex-shrink-0"><X size={16}/></button></div>
                            ) : (
                                <div className="flex items-center min-w-0 gap-2"><UserAvatar name={task.assignedTo} size="sm" /><span className="truncate">{task.assignedTo}</span>{canChangeAssignee && (<button onClick={() => setIsEditingAssignee(true)} className="ml-2 text-gray-400 hover:text-indigo-600 flex-shrink-0"><Edit size={14} /></button>)}</div>
                            )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2"><button onClick={() => setIsCommentsOpen(true)} className="text-gray-500 hover:text-indigo-600 p-1"><MessageSquare className="w-4 h-4" /></button>{canDelete && <button onClick={() => onDeleteTask(task.id)} className="text-red-500 hover:text-red-700 p-1" aria-label="Eliminar tarea"><Trash2 className="w-4 h-4" /></button>}</div>
                    </div>
                    <div className="mt-3"><select value={task.status} onChange={(e) => onUpdateTask(task.id, { status: e.target.value })} disabled={!canUpdate} className={`w-full p-2 rounded-md text-sm font-medium bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${!canUpdate ? 'cursor-not-allowed' : ''}`}><option value="Pendiente">Pendiente</option><option value="En Progreso">En Progreso</option><option value="Completada">Completada</option></select></div>
                </div>
            </div>
        </>
    );
};

const TaskColumn = ({ title, tasks, onUpdateTask, onDeleteTask, currentUser, allUsers, isReadOnly = false }) => {
    const columnStyles = {
        'Pendiente': { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500' },
        'En Progreso': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-500' },
        'Completada': { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-500' },
        'Total Tareas': { bg: 'bg-gray-100 dark:bg-gray-800/50', border: 'border-gray-400' },
    };
    const style = columnStyles[title] || { bg: 'bg-gray-100', border: 'border-gray-400' };
    return (
        <div className={`flex-1 min-w-[300px] p-4 rounded-xl ${style.bg}`}><h3 className={`font-bold text-lg mb-4 pb-2 border-b-2 ${style.border} text-gray-700 dark:text-gray-300`}>{title} ({tasks.length})</h3><div>{tasks.map(task => <TaskCard key={task.id} task={task} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} currentUser={currentUser} allUsers={allUsers} isReadOnly={isReadOnly}/>)}</div></div>
    );
};

const AddTaskModal = ({ isOpen, onClose, onAddTask, users, currentUser }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [priority, setPriority] = useState('Media');
    const modalRef = useRef();

    useEffect(() => { if (isOpen && users.length > 0) setAssignedTo(users[0]?.name || ''); }, [isOpen, users]);
    useEffect(() => {
        const handleClickOutside = (event) => { if (modalRef.current && !modalRef.current.contains(event.target)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !assignedTo) return;
        onAddTask({ title, description, assignedTo, priority, createdBy: currentUser.name, assignmentDate: serverTimestamp(), deliveryDate: null });
        setTitle(''); setDescription(''); setPriority('Media'); onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"><div ref={modalRef} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md"><h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Añadir Nueva Tarea</h2><form onSubmit={handleSubmit} className="space-y-4"><div><label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label><input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500" required /></div><div><label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"></textarea></div><div><label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignar a</label><select id="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500" required>{users.map(user => <option key={user.uid} value={user.name}>{user.name}</option>)}</select></div><div><label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad</label><select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500" required><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option></select></div><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"><Plus className="w-4 h-4 mr-2" />Añadir Tarea</button></div></form></div></div>
    );
};

const UserManagementModal = ({ isOpen, onClose, onAddUser, onDeleteUser, onUpdateUserRole, allUsers, currentUser }) => {
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('Colaborador');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [error, setError] = useState('');
    const modalRef = useRef();

    useEffect(() => {
        const handleClickOutside = (event) => { if (modalRef.current && !modalRef.current.contains(event.target)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError('');
        if (newUserName.trim() && newUserPassword.trim() && newUserEmail.trim()) {
            const success = await onAddUser({ name: newUserName.trim(), email: newUserEmail.trim(), role: newUserRole, password: newUserPassword });
            if (success) { setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setError(''); } 
            else { setError('No se pudo crear el usuario. El email podría estar ya en uso.'); }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"><div ref={modalRef} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Gestionar Usuarios</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="w-6 h-6 text-gray-600 dark:text-gray-300"/></button></div><div><form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50"><input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nombre completo" className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" required /><input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="Email de acceso" className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" required /><input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Contraseña" className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" required /><select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"><option value="Colaborador">Colaborador</option><option value="Coordinador">Coordinador</option></select><button type="submit" className="sm:col-span-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"><UserPlus className="w-5 h-5 mr-2"/>Añadir Usuario</button>{error && <p className="text-red-500 text-sm sm:col-span-2">{error}</p>}</form><div className="space-y-3 max-h-80 overflow-y-auto pr-2">{allUsers.map(user => (<div key={user.uid} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900/50 border dark:border-gray-700 rounded-md"><div className="flex items-center gap-3"><UserAvatar name={user.name} size="md" /><div><p className="font-semibold text-gray-800 dark:text-gray-100">{user.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>{currentUser.uid === user.uid ? (<p className="text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full inline-block mt-1">{user.role}</p>) : (<select value={user.role} onChange={(e) => onUpdateUserRole(user.uid, e.target.value)} className="mt-1 p-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-700"><option value="Colaborador">Colaborador</option><option value="Coordinador">Coordinador</option></select>)}</div></div>{currentUser.uid !== user.uid && (<button onClick={() => onDeleteUser(user.uid, user.name)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" aria-label={`Eliminar a ${user.name}`}><Trash2 className="w-5 h-5"/></button>)}</div>))}</div></div></div></div>
    );
};

const DashboardModal = ({ isOpen, onClose, tasks, users }) => {
    const modalRef = useRef();

    const stats = useMemo(() => {
        const total = tasks.length;
        const pending = tasks.filter(t => t.status === 'Pendiente').length;
        const inProgress = tasks.filter(t => t.status === 'En Progreso').length;
        const completed = tasks.filter(t => t.status === 'Completada').length;
        const tasksPerUser = users.map(user => ({
            name: user.name,
            count: tasks.filter(t => t.assignedTo === user.name).length
        }));
        return { total, pending, inProgress, completed, tasksPerUser };
    }, [tasks, users]);

    useEffect(() => {
        const handleClickOutside = (event) => { if (modalRef.current && !modalRef.current.contains(event.target)) onClose(); };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"><div ref={modalRef} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard del Proyecto</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="w-6 h-6 text-gray-600 dark:text-gray-300"/></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-200">Resumen de Tareas</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg"><p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total</p></div>
                <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg"><p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.pending}</p><p className="text-sm text-blue-500 dark:text-blue-300">Pendientes</p></div>
                <div className="p-4 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg"><p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.inProgress}</p><p className="text-sm text-yellow-500 dark:text-yellow-300">En Progreso</p></div>
                <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg"><p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p><p className="text-sm text-green-500 dark:text-green-300">Completadas</p></div>
            </div>
        </div><div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-200">Carga de Trabajo por Usuario</h3>
            <div className="space-y-3">{stats.tasksPerUser.map(user => (<div key={user.name}><div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-600 dark:text-gray-300">{user.name}</span><span className="text-gray-500 dark:text-gray-400">{user.count} Tareas</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${stats.total > 0 ? (user.count / stats.total) * 100 : 0}%` }}></div></div></div>))}</div>
        </div></div></div></div>
    );
};

const AuthScreen = ({ onLogin, onRegister, error, isRegisterMode }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isRegisterMode) { if(email && password && name) onRegister(email, password, name); } 
        else { if(email && password) onLogin(email, password); }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
            <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-2xl text-center">
                <TeamworkIllustration />
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{isRegisterMode ? 'Registrar Coordinador' : 'Bienvenido a Taysync'}</h1>
                <p className="text-gray-600 mb-8">{isRegisterMode ? 'Crea la primera cuenta de administrador.' : 'Ingresa con tu email y contraseña.'}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegisterMode && <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre completo" className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-indigo-500" required />}
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-indigo-500" required />
                    <div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-indigo-500" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">{showPassword ? <EyeOff/> : <Eye/>}</button></div>
                    {error && <p className="text-red-500 text-sm pt-2">{error}</p>}
                    <button type="submit" className="w-full p-3 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center"><LogIn className="w-5 h-5 mr-2" />{isRegisterMode ? 'Registrar y Entrar' : 'Entrar al Tablero'}</button>
                </form>
            </div>
            <footer className="mt-8 text-sm text-gray-500"><p>ID de la Sesión para compartir: {appId}</p></footer>
        </div>
    );
};

export default function App() {
    const [tasks, setTasks] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(undefined);
    const [loading, setLoading] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('taysync-dark-mode') === 'true';
        }
        return false;
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUser, setFilterUser] = useState('');

    const tasksCollectionRef = collection(db, `artifacts/${appId}/public/data/tasks`);
    const usersCollectionRef = collection(db, `artifacts/${appId}/public/data/users`);

    useEffect(() => {
        const unsubscribeUsers = onSnapshot(usersCollectionRef, (usersSnapshot) => {
            const usersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setAllUsers(usersData);

            const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
                if (authUser) {
                    const userProfile = usersData.find(u => u.uid === authUser.uid);
                    setCurrentUser(userProfile || null);
                } else {
                    setCurrentUser(null);
                }
                setLoading(false);
            });

            return () => unsubscribeAuth();
        }, (error) => {
            console.error("Error al cargar usuarios:", error);
            setLoading(false);
        });

        return () => unsubscribeUsers();
    }, [usersCollectionRef]);

    useEffect(() => {
        if (!currentUser) return;
        const q = query(tasksCollectionRef);
        const unsubscribeTasks = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            tasksData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setTasks(tasksData);
        }, (err) => { console.error("Error al cargar tareas:", err); });
        return () => unsubscribeTasks();
    }, [currentUser, tasksCollectionRef]);

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('taysync-dark-mode', 'true');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('taysync-dark-mode', 'false');
        }
    }, [isDarkMode]);

    const handleRegister = async (email, password, name) => {
        setAuthError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, `artifacts/${appId}/public/data/users`, userCredential.user.uid), { uid: userCredential.user.uid, name, email, role: 'Coordinador' });
        } catch (error) { setAuthError('No se pudo registrar. El email puede estar en uso.'); console.error(error); }
    };
    
    const handleLogin = async (email, password) => {
        setAuthError('');
        try { await signInWithEmailAndPassword(auth, email, password); } 
        catch (error) { setAuthError('Email o contraseña incorrectos.'); console.error(error); }
    };

    const handleLogout = async () => { await signOut(auth); };
    const handleAddTask = async (taskData) => { try { await addDoc(tasksCollectionRef, { ...taskData, status: 'Pendiente', createdAt: serverTimestamp() }); } catch (error) { console.error("Error adding task:", error); } };
    const handleUpdateTask = async (taskId, updates) => { const taskDoc = doc(db, `artifacts/${appId}/public/data/tasks`, taskId); try { await updateDoc(taskDoc, updates); } catch (error) { console.error("Error updating task:", error); } };
    const handleDeleteTask = async (taskId) => { const taskDocRef = doc(db, `artifacts/${appId}/public/data/tasks`, taskId); try { await deleteDoc(taskDocRef); } catch (error) { console.error("Error deleting task:", error); } };
    const handleAddUser = async (userData) => { try { const tempApp = initializeApp(firebaseConfig, `temp-user-creation-${Date.now()}`); const tempAuth = getAuth(tempApp); const userCredential = await createUserWithEmailAndPassword(tempAuth, userData.email, userData.password); await setDoc(doc(db, `artifacts/${appId}/public/data/users`, userCredential.user.uid), { uid: userCredential.user.uid, name: userData.name, email: userData.email, role: userData.role }); await signOut(tempAuth); return true; } catch (error) { console.error("Error creating user:", error); return false; } };
    const handleUpdateUserRole = async (userId, newRole) => { const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userId); try { await updateDoc(userDocRef, { role: newRole }); } catch (error) { console.error("Error al actualizar el rol del usuario:", error); } };
    const handleDeleteUser = async (userId, userName) => { alert(`La eliminación de usuarios desde el cliente no es segura y está deshabilitada.`); };

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const searchTermMatch = searchTerm === '' || task.title.toLowerCase().includes(searchTerm.toLowerCase()) || (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const userFilterMatch = filterUser === '' || task.assignedTo === filterUser;
            return searchTermMatch && userFilterMatch;
        });
    }, [tasks, searchTerm, filterUser]);

    if (loading) { return <div className="min-h-screen flex justify-center items-center bg-gray-50 dark:bg-gray-900"><Loader2 className="w-16 h-16 text-indigo-600 animate-spin" /></div>; }
    
    if (!currentUser) { const isFirstUser = allUsers.length === 0; return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} error={authError} isRegisterMode={isFirstUser} />; }
    
    const visibleTasks = currentUser.role === 'Coordinador' ? filteredTasks : filteredTasks.filter(task => task.assignedTo === currentUser.name || task.status === 'Completada');
    const pendingTasks = visibleTasks.filter(t => t.status === 'Pendiente');
    const inProgressTasks = visibleTasks.filter(t => t.status === 'En Progreso');
    const completedTasks = visibleTasks.filter(t => t.status === 'Completada');

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-200">
            <header className="bg-white dark:bg-gray-800 shadow-sm p-4 sticky top-0 z-20">
                <div className="container mx-auto flex justify-between items-center flex-wrap gap-4">
                    <AppLogo />
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-3">
                            <UserAvatar name={currentUser.name} size="lg" />
                            <div className="text-right">
                                <p className="font-semibold">{currentUser.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser.role}</p>
                            </div>
                        </div>
                        {currentUser.role === 'Coordinador' && (<button onClick={() => setIsDashboardOpen(true)} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"><BarChart2 className="w-5 h-5" /></button>)}
                        {currentUser.role === 'Coordinador' && (<button onClick={() => setIsUserModalOpen(true)} className="bg-gray-700 dark:bg-gray-600 text-white px-3 py-2 rounded-lg shadow hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors flex items-center gap-2"><Users className="w-5 h-5" /></button>)}
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">{isDarkMode ? <Sun/> : <Moon/>}</button>
                        <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-2 rounded-lg shadow hover:bg-red-600 transition-colors flex items-center gap-2"><LogOut className="w-5 h-5" /></button>
                    </div>
                </div>
            </header>

            <main className="p-4 sm:p-8">
                <div className="container mx-auto mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative flex-grow w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" placeholder="Buscar tarea..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"/></div>
                        <div className="relative flex-grow w-full sm:w-auto"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full p-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 appearance-none"><option value="">Todos los usuarios</option>{allUsers.map(u => <option key={u.uid} value={u.name}>{u.name}</option>)}</select></div>
                        {currentUser.role === 'Coordinador' && (<button onClick={() => setIsTaskModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"><Plus className="w-5 h-5" /> Nueva Tarea</button>)}
                    </div>
                </div>
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <TaskColumn title="Pendiente" tasks={pendingTasks} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} currentUser={currentUser} allUsers={allUsers} />
                        <TaskColumn title="En Progreso" tasks={inProgressTasks} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} currentUser={currentUser} allUsers={allUsers} />
                        <TaskColumn title="Completada" tasks={completedTasks} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} currentUser={currentUser} allUsers={allUsers} />
                        <TaskColumn title="Total Tareas" tasks={filteredTasks} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} currentUser={currentUser} allUsers={allUsers} isReadOnly={true} />
                    </div>
                </div>
            </main>

            {currentUser.role === 'Coordinador' && (<><AddTaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onAddTask={handleAddTask} users={allUsers} currentUser={currentUser} /><UserManagementModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} onUpdateUserRole={handleUpdateUserRole} allUsers={allUsers} currentUser={currentUser} /><DashboardModal isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} tasks={tasks} users={allUsers} /></>)}
            <footer className="text-center p-4 text-sm text-gray-500 dark:text-gray-400"><p>ID de la Sesión para compartir: {appId}</p></footer>
        </div>
    );
}
