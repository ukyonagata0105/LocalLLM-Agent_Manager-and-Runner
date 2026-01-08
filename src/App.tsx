import { useEffect } from 'react';
import { DashboardLayout } from './modules/M21_dashboard';
import { getLLMManager } from './modules/M02_llm/LLMManager';
import { ToastProvider } from './components/Toast';

function App() {
    useEffect(() => {
        // Load LLM configuration from electron-store on startup
        getLLMManager().loadFromStore();
    }, []);

    return (
        <ToastProvider>
            <DashboardLayout />
        </ToastProvider>
    );
}

export default App;
