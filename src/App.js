import React, { useState, useEffect } from 'react';



// 🔥 SUAS CREDENCIAIS DO FIREBASE
// Importar as configurações do Firebase
import { db } from './firebase';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
 

  // Verificar autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Carregar tarefas do Firestore
  useEffect(() => {
    if (user) {
      carregarTarefas();
    }
  }, [user]);

  const carregarTarefas = async () => {
    try {
      const q = query(collection(db, 'tarefas'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const tarefasCarregadas = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTarefas(tarefasCarregadas);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    }
  };

  const fazerLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Erro ao fazer login. Tente novamente.');
    }
  };

  const fazerLogout = async () => {
    try {
      await signOut(auth);
      setTarefas([]);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  const adicionarTarefa = async () => {
    if (!novaTarefa.trim()) return;

    try {
      await addDoc(collection(db, 'tarefas'), {
        texto: novaTarefa,
        concluida: false,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp()
      });
      setNovaTarefa('');
      carregarTarefas();
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      alert('Erro ao adicionar tarefa. Verifique suas permissões no Firestore.');
    }
  };

  const deletarTarefa = async (id) => {
    try {
      await deleteDoc(doc(db, 'tarefas', id));
      carregarTarefas();
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">🔥</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Firebase App</h1>
            <p className="text-gray-600">Faça login para começar</p>
          </div>
          <button
            onClick={fazerLogin}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={user.photoURL} 
                alt="Foto"
                className="w-12 h-12 rounded-full border-2 border-blue-500"
              />
              <div>
                <p className="font-semibold text-gray-800">{user.displayName}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={fazerLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 Minhas Tarefas</h2>
          
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={novaTarefa}
              onChange={(e) => setNovaTarefa(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && adicionarTarefa()}
              placeholder="Adicionar nova tarefa..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={adicionarTarefa}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition duration-200"
            >
              Adicionar
            </button>
          </div>

          <div className="space-y-3">
            {tarefas.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhuma tarefa ainda. Adicione uma!</p>
            ) : (
              tarefas.map((tarefa) => (
                <div
                  key={tarefa.id}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition duration-200"
                >
                  <span className="text-gray-700">{tarefa.texto}</span>
                  <button
                    onClick={() => deletarTarefa(tarefa.id)}
                    className="text-red-500 hover:text-red-700 font-semibold transition duration-200"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-center mt-6 text-gray-600 text-sm">
          Total de tarefas: {tarefas.length}
        </div>
      </div>
    </div>
  );
}