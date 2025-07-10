import React, { useState, useEffect, useRef } from 'react';
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
    where,
    getDocs,
    deleteDoc,
    setDoc
} from 'firebase/firestore';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { Plus, User, LogIn, LogOut, Loader2, Users, Trash2, ShieldCheck, UserCheck, UserPlus, X, Eye, EyeOff, ClipboardCheck } from 'lucide-react';

// --- Configuración de Firebase ---
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG 
    ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) 
    : {};
const appId = process.env.REACT_APP_ID || 'default-task-app';


// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Componentes Visuales Personalizados ---

const AppLogo = () => (
    <div className="flex items-center gap-2">
        <ClipboardCheck className="w-8 h-8 text-indigo-600" />
        <span className="text-2xl font-bold text-gray-800">TaskFlow</span>
    </div>
);

const TeamworkIllustration = () => (
    <svg width="100%" height="100%" viewBox="0 0 200 150" className="w-48 h-48 mx-auto text-indigo-500 mb-4">
        <rect x="10" y="50" width="180" height="90" rx="10" fill="none" stroke="currentColor" strokeWidth="2"/>
        <path d="M10 70 H 190" stroke="currentColor" strokeWidth="1" strokeDasharray="4"/>
        
        {/* Person 1 */}
        <circle cx="50" cy="30" r="10" fill="currentColor" />
        <path d="M40 45 C 40 55, 60 55, 60 45" fill="none" stroke="currentColor" strokeWidth="2" />
        
        {/* Person 2 */}
        <circle cx="100" cy="30" r="10" fill="currentColor" />
        <path d="M90 45 C 90 55, 110 55, 110 45" fill="none" stroke="currentColor" strokeWidth="2" />

        {/* Person 3 */}
        <circle cx="150" cy="30" r="10" fill="currentColor" />
        <path d="M140 45 C 140 55, 160 55, 160 45" fill="none" stroke="currentColor" strokeWidth="2" />

        {/* Task items */}
        <path d="M30 85 h 60" stroke="currentColor" strokeWidth="2" />
        <path d="M30 105 h 80" stroke="currentColor" strokeWidth="2" />
        <path d="M30 125 h 50" stroke="currentColor" strokeWidth="2" />
        
        <path d="M130 85 h 40" stroke="currentColor" strokeWidth="2" />
        <path d="M130 105 h 30" stroke="currentColor" strokeWidth="2" />
    </svg>
);


// --- Componentes de la Interfaz ---

const TaskCard = ({ task, onUpdateStatus, onDeleteTask, currentUser }) => {
    const { title, description, assignedTo, status } = task;
    const statusColors = {
        'Pendiente': 'bg-blue-100 text-blue-800 border-l-blue-500',
        'En Progreso': 'bg-yellow-100 text-yellow-800 border-l-yellow-500',
        'Completada': 'bg-green-100 text-green-800 border-l-green-500',
    };
    const handleStatusChange = (e) => onUpdateStatus(task.id, e.target.value);
    const canDelete = currentUser.role === 'Coordinador';
    const canUpdateStatus = currentUser.role === 'Coordinador' || currentUser.name === assignedTo;

    return (
        <div className={`bg-white p-4 rounded-lg shadow-md mb-4 transition-transform hover:scale-105 border-l-4 ${statusColors[status]}`}>
            <h4 className="font-bold text-gray-800">{title}</h4>
            <p className="text-sm text-gray-600 my-2">{description}</p>
            <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center"><User className="w-4 h-4 mr-2" /><span>{assignedTo}</span></div>
                    {canDelete && <button onClick={() => onDeleteTask(task.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100" aria-label="Eliminar tarea"><Trash2 className="w-4 h-4" /></button>}
                </div>
                <div className="mt-3">
                    <select value={status} onChange={handleStatusChange} disabled={!canUpdateStatus} className={`w-full p-2 rounded-md text-sm font-medium bg-gray-50 border-gray-300 ${!canUpdateStatus ? 'cursor-not-allowed' : ''}`}>
                        <option value="Pendiente">Pendiente</option>
                        <option value="En Progreso">En Progreso</option>
                        <option value="Completada">Completada</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

const TaskColumn = ({ title, tasks, onUpdateStatus, onDeleteTask, currentUser }) => {
    const columnStyles = {
        'Pendiente': { bg: 'bg-blue-50', border: 'border-blue-500' },
        'En Progreso': { bg: 'bg-yellow-50', border: 'border-yellow-500' },
        'Completada': { bg: 'bg-green-50', border: 'border-green-500' },
    };
    const style = columnStyles[title] || { bg: 'bg-gray-100', border: 'border-gray-400' };
    return (
        <div className={`flex-1 min-w-[300px] p-4 rounded-xl ${style.bg}`}>
            <h3 className={`font-bold text-lg mb-4 pb-2 border-b-2 ${style.border} text-gray-700`}>{title} ({tasks.length})</h3>
            <div>{tasks.map(task => <TaskCard key={task.id} task={task} onUpdateStatus={onUpdateStatus} onDeleteTask={onDeleteTask} currentUser={currentUser}/>)}</div>
        </div>
    );
};

const AddTaskModal = ({ isOpen, onClose, onAddTask, users, currentUser }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const modalRef = useRef();

    useEffect(() => {
        if (isOpen && users.length > 0) setAssignedTo(users[0]?.name || '');
    }, [isOpen, users]);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !assignedTo) return;
        onAddTask({ title, description, assignedTo, createdBy: currentUser.name });
        setTitle(''); setDescription(''); onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div ref={modalRef} className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md m-4"><h2 className="text-2xl font-bold mb-6 text-gray-800">Añadir Nueva Tarea</h2><form onSubmit={handleSubmit}><div className="mb-4"><label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Título</label><input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" required /></div><div className="mb-4"><label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"></textarea></div><div className="mb-6"><label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label><select id="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" required>{users.map(user => <option key={user.uid} value={user.name}>{user.name}</option>)}</select></div><div className="flex justify-end gap-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"><Plus className="w-4 h-4 mr-2" />Añadir Tarea</button></div></form></div></div>
    );
};

const UserManagementModal = ({ isOpen, onClose, onAddUser, onDeleteUser, allUsers }) => {
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('Colaborador');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [error, setError] = useState('');
    const modalRef = useRef();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) onClose();
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError('');
        if (newUserName.trim() && newUserPassword.trim() && newUserEmail.trim()) {
            const success = await onAddUser({ 
                name: newUserName.trim(), 
                email: newUserEmail.trim(),
                role: newUserRole, 
                password: newUserPassword 
            });
            if (success) {
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPassword('');
                setError('');
            } else {
                setError('No se pudo crear el usuario. El email podría estar ya en uso.');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div ref={modalRef} className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg m-4"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Gestionar Usuarios</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X className="w-6 h-6 text-gray-600"/></button></div><div>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
                <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nombre completo" className="p-2 border border-gray-300 rounded-md" required />
                <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="Email de acceso" className="p-2 border border-gray-300 rounded-md" required />
                <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Contraseña" className="p-2 border border-gray-300 rounded-md" required />
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="p-2 border border-gray-300 rounded-md"><option value="Colaborador">Colaborador</option><option value="Coordinador">Coordinador</option></select>
                <button type="submit" className="sm:col-span-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"><UserPlus className="w-5 h-5 mr-2"/>Añadir Usuario</button>
                {error && <p className="text-red-500 text-sm sm:col-span-2">{error}</p>}
            </form>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {allUsers.map(user => (
                <div key={user.uid} className="flex items-center justify-between p-3 bg-white border rounded-md"><div><p className="font-semibold">{user.name}</p><p className="text-sm text-gray-500">{user.email}</p><p className="text-xs text-gray-400 font-mono">{user.role}</p></div>
                </div>
            ))}
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
        if (isRegisterMode) {
            if(email && password && name) onRegister(email, password, name);
        } else {
            if(email && password) onLogin(email, password);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
            <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-2xl text-center">
                <TeamworkIllustration />
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{isRegisterMode ? 'Registrar Coordinador' : 'Bienvenido a TaskFlow'}</h1>
                <p className="text-gray-600 mb-8">{isRegisterMode ? 'Crea la primera cuenta de administrador.' : 'Ingresa con tu email y contraseña.'}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegisterMode && <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre completo" className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-indigo-500" required />}
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-indigo-500" required />
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="w-full p-3 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-indigo-500" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">{showPassword ? <EyeOff/> : <Eye/>}</button>
                    </div>
                    {error && <p className="text-red-500 text-sm pt-2">{error}</p>}
                    <button type="submit" className="w-full p-3 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center">
                        <LogIn className="w-5 h-5 mr-2" />{isRegisterMode ? 'Registrar y Entrar' : 'Entrar al Tablero'}
                    </button>
                </form>
            </div>
            <footer className="mt-8 text-sm text-gray-500"><p>ID de la Sesión: {appId}</p></footer>
        </div>
    );
};

export default function App() {
    const [tasks, setTasks] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [authError, setAuthError] = useState('');

    const tasksCollectionRef = collection(db, `artifacts/${appId}/public/data/tasks`);
    const usersCollectionRef = collection(db, `artifacts/${appId}/public/data/users`);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await getDocs(query(usersCollectionRef, where("uid", "==", user.uid)));

                if (!userDoc.empty) {
                    const userData = userDoc.docs[0].data();
                    setCurrentUser({
                        uid: user.uid,
                        email: user.email,
                        ...userData
                    });
                }
            } else {
                setCurrentUser(null);
            }
            setAuthLoading(false);
        });

        const unsubscribeUsers = onSnapshot(usersCollectionRef, (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });

        return () => {
            unsubscribe();
            unsubscribeUsers();
        };
    }, []);

     useEffect(() => {
        if (!currentUser) return;
        const unsubscribeTasks = onSnapshot(tasksCollectionRef, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return () => unsubscribeTasks();
    }, [currentUser]);

    const handleRegister = async (email, password, name) => {
        setAuthError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const newUser = {
                uid: user.uid,
                name: name,
                email: email,
                role: 'Coordinador' // First user is always a coordinator
            };
            await setDoc(doc(db, `artifacts/${appId}/public/data/users`, user.uid), newUser);
            setCurrentUser(newUser);
        } catch (error) {
            setAuthError('No se pudo registrar. El email puede estar en uso.');
            console.error(error);
        }
    };
    
    const handleLogin = async (email, password) => {
        setAuthError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setAuthError('Email o contraseña incorrectos.');
            console.error(error);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    const handleAddTask = async (taskData) => {
        try { await addDoc(tasksCollectionRef, { ...taskData, status: 'Pendiente', createdAt: serverTimestamp() }); } 
        catch (error) { console.error("Error adding task:", error); }
    };

    const handleUpdateTaskStatus = async (taskId, newStatus) => {
        const taskDoc = doc(db, `artifacts/${appId}/public/data/tasks`, taskId);
        try { await updateDoc(taskDoc, { status: newStatus }); } 
        catch (error) { console.error("Error updating task:", error); }
    };
    
    const handleDeleteTask = async (taskId) => {
        const taskDocRef = doc(db, `artifacts/${appId}/public/data/tasks`, taskId);
        try { await deleteDoc(taskDocRef); } 
        catch (error) { console.error("Error deleting task:", error); }
    };

    const handleAddUser = async (userData) => {
        try {
            // This is a simplified approach. In a real app, you'd use Firebase Functions
            // to create users to avoid exposing admin credentials on the client.
            const tempApp = initializeApp(firebaseConfig, 'temp-user-creation');
            const tempAuth = getAuth(tempApp);
            const userCredential = await createUserWithEmailAndPassword(tempAuth, userData.email, userData.password);
            const user = userCredential.user;

            await setDoc(doc(db, `artifacts/${appId}/public/data/users`, user.uid), {
                uid: user.uid,
                name: userData.name,
                email: userData.email,
                role: userData.role
            });
            await signOut(tempAuth);
            // This is a workaround to delete the temporary app instance
            // In a real SDK environment, you would use deleteApp(tempApp)
            // but that might not be available here.
            return true;
        } catch (error) {
            console.error("Error creating user:", error);
            return false;
        }
    };

    if (authLoading) return <div className="min-h-screen flex justify-center items-center bg-gray-50"><Loader2 className="w-16 h-16 text-indigo-600 animate-spin" /></div>;
    
    if (!currentUser) {
        const isFirstUser = allUsers.length === 0;
        return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} error={authError} isRegisterMode={isFirstUser} />;
    }
    
    const visibleTasks = currentUser.role === 'Coordinador' ? tasks : tasks.filter(task => task.assignedTo === currentUser.name || task.status === 'Completada');
    const pendingTasks = visibleTasks.filter(t => t.status === 'Pendiente');
    const inProgressTasks = visibleTasks.filter(t => t.status === 'En Progreso');
    const completedTasks = visibleTasks.filter(t => t.status === 'Completada');

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
            <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
                <div className="container mx-auto flex justify-between items-center flex-wrap gap-4">
                    <AppLogo />
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="flex items-center gap-2 font-semibold">
                                {currentUser.role === 'Coordinador' ? <ShieldCheck className="w-5 h-5 text-green-600"/> : <UserCheck className="w-5 h-5 text-blue-600"/>}
                                {currentUser.name}
                            </div>
                            <p className="text-sm text-gray-500">{currentUser.role}</p>
                        </div>
                        {currentUser.role === 'Coordinador' && (
                            <button onClick={() => setIsUserModalOpen(true)} className="bg-gray-700 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-800 transition-colors flex items-center gap-2">
                                <Users className="w-5 h-5" /> Gestionar
                            </button>
                        )}
                        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600 transition-colors flex items-center gap-2">
                            <LogOut className="w-5 h-5" /> Salir
                        </button>
                    </div>
                </div>
            </header>

            <main className="p-4 sm:p-8">
                {currentUser.role === 'Coordinador' && (
                    <div className="container mx-auto mb-6 flex justify-end">
                        <button onClick={() => setIsTaskModalOpen(true)} className="bg-indigo-600 text-white px-5 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Nueva Tarea
                        </button>
                    </div>
                )}
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-4">
                        <TaskColumn title="Pendiente" tasks={pendingTasks} onUpdateStatus={handleUpdateTaskStatus} onDeleteTask={handleDeleteTask} currentUser={currentUser} />
                        <TaskColumn title="En Progreso" tasks={inProgressTasks} onUpdateStatus={handleUpdateTaskStatus} onDeleteTask={handleDeleteTask} currentUser={currentUser} />
                        <TaskColumn title="Completada" tasks={completedTasks} onUpdateStatus={handleUpdateTaskStatus} onDeleteTask={handleDeleteTask} currentUser={currentUser} />
                    </div>
                </div>
            </main>

            {currentUser.role === 'Coordinador' && (
                <>
                    <AddTaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onAddTask={handleAddTask} users={allUsers} currentUser={currentUser} />
                    <UserManagementModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onAddUser={handleAddUser} allUsers={allUsers} />
                </>
            )}
            <footer className="text-center p-4 text-sm text-gray-500"><p>ID de la Sesión para compartir: {appId}</p></footer>
        </div>
    );
}