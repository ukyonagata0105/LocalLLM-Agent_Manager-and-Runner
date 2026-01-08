import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Server, Key, Monitor } from 'lucide-react';

// Simple hook to manage config via IPC
const useConfig = (key: string, defaultValue: any) => {
    const [value, setValue] = useState(defaultValue);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                // @ts-expect-error
                if (window.ipcRenderer) {
                    // @ts-expect-error
                    const saved = await window.ipcRenderer.invoke('get-config', key);
                    if (saved !== undefined) setValue(saved);
                } else {
                    // Browser Fallback
                    const saved = localStorage.getItem(`config:${key}`);
                    if (saved !== null) {
                        try {
                            setValue(JSON.parse(saved));
                        } catch {
                            setValue(saved);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load config', key, e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [key]);

    const save = async (newValue: any) => {
        setValue(newValue);
        try {
            // @ts-expect-error
            if (window.ipcRenderer) {
                // @ts-expect-error
                await window.ipcRenderer.invoke('set-config', key, newValue);
            } else {
                // Browser Fallback
                localStorage.setItem(`config:${key}`, JSON.stringify(newValue));
            }
        } catch (e) {
            console.error('Failed to save config', key, e);
        }
    };

    return [value, save, loading];
};

export const LLMSettings: React.FC = () => {
    const [provider, setProvider] = useConfig('llm.provider', 'openai');
    const [apiKey, setApiKey] = useConfig('llm.apiKey', '');
    const [model, setModel] = useConfig('llm.model', 'gpt-4-turbo');
    const [baseUrl, setBaseUrl] = useConfig('llm.baseUrl', '');

    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Effect to auto-discover models for local providers
    useEffect(() => {
        if (provider === 'lmstudio' || provider === 'ollama') {
            checkConnection();
        } else {
            setConnectionStatus('unknown');
            setAvailableModels([]);
        }
    }, [provider, baseUrl]);

    const checkConnection = async () => {
        setConnectionStatus('unknown');
        try {
            // @ts-expect-error
            if (window.ipcRenderer) {
                // Electron Mode
                // @ts-expect-error
                const result = await window.ipcRenderer.invoke('get-llm-models');
                if (result.success) {
                    setAvailableModels(result.models);
                    setConnectionStatus('connected');
                } else {
                    setConnectionStatus('error');
                    setAvailableModels([]);
                }
            } else {
                // Browser Mode (Remote Access) - Direct Fetch Fallback
                const targetUrl = baseUrl || (provider === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:11434/v1');
                const fetchUrl = `${targetUrl}/models`;

                try {
                    const res = await fetch(fetchUrl);
                    if (!res.ok) throw new Error('Failed to fetch');
                    const data = await res.json();
                    setAvailableModels(data.data.map((m: any) => m.id));
                    setConnectionStatus('connected');
                } catch (err: any) {
                    console.warn('Direct fetch failed (likely CORS or unreachable):', err);
                    setConnectionStatus('error');
                }
            }
        } catch (e) {
            console.error('Failed to fetch models', e);
            setConnectionStatus('error');
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        setSaveMessage(null);

        try {
            const effectiveBaseUrl = baseUrl || (provider === 'lmstudio' ? 'http://localhost:1234/v1' : '');

            // @ts-expect-error
            if (window.ipcRenderer) {
                // @ts-expect-error
                const result = await window.ipcRenderer.invoke('sync-llm-config', {
                    provider,
                    model,
                    apiKey: apiKey || 'not-needed',
                    baseUrl: effectiveBaseUrl,
                });

                if (result.success) {
                    // Show user the effective model name that OpenHands will use
                    const effectiveModel = effectiveBaseUrl && !model.startsWith('openai/')
                        ? `openai/${model}`
                        : model;
                    setSaveMessage({
                        type: 'success',
                        text: `✓ Settings synced! OpenHands will use: ${effectiveModel}`
                    });
                } else {
                    setSaveMessage({ type: 'error', text: 'Failed to sync settings' });
                }
            } else {
                // Browser mode - just save locally
                localStorage.setItem('config:llm.provider', JSON.stringify(provider));
                localStorage.setItem('config:llm.model', JSON.stringify(model));
                localStorage.setItem('config:llm.apiKey', JSON.stringify(apiKey));
                localStorage.setItem('config:llm.baseUrl', JSON.stringify(effectiveBaseUrl));
                setSaveMessage({ type: 'success', text: '✓ Settings saved (Run in Electron for OpenHands sync)' });
            }
        } catch (e: any) {
            setSaveMessage({ type: 'error', text: e.message });
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(null), 5000);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Key size={20} className="text-purple-400" />
                    Provider Configuration
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Provider</label>
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                        >
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="google">Google Gemini</option>
                            <option value="lmstudio">LM Studio (Local)</option>
                            <option value="ollama">Ollama (Local)</option>
                        </select>
                    </div>

                    {(provider === 'lmstudio' || provider === 'ollama') && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm text-gray-400">Base URL</label>
                                {connectionStatus === 'connected' && <span className="text-xs text-green-400 flex items-center gap-1">● Connected</span>}
                                {connectionStatus === 'error' && <span className="text-xs text-red-400 flex items-center gap-1">● Disconnected</span>}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={baseUrl}
                                    onChange={(e) => setBaseUrl(e.target.value)}
                                    placeholder="http://localhost:1234/v1"
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                                />
                                <button
                                    onClick={checkConnection}
                                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm"
                                >
                                    Check
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Default for LM Studio: http://localhost:1234/v1</p>
                            {connectionStatus === 'error' && (
                                <p className="text-xs text-yellow-500 mt-1">
                                    Connection failed (CORS or unreachable). You can still manually enter the Model Name below.
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={provider === 'lmstudio' ? 'Not required for local' : 'sk-...'}
                            disabled={provider === 'lmstudio'}
                            className={`w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white ${provider === 'lmstudio' ? 'opacity-50' : ''}`}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Model Name</label>
                        {availableModels.length > 0 ? (
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                            >
                                {availableModels.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder="e.g. gpt-4, claude-3-opus"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                            />
                        )}
                        {availableModels.length > 0 && provider === 'lmstudio' && (
                            <p className="text-xs text-green-500 mt-1">✓ Loaded {availableModels.length} models from LM Studio</p>
                        )}
                    </div>
                </div>
            </div>

            {saveMessage && (
                <div className={`p-3 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-900/30 border border-green-700 text-green-400' : 'bg-red-900/30 border border-red-700 text-red-400'}`}>
                    {saveMessage.text}
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg text-white hover:bg-purple-500 disabled:opacity-50"
                >
                    <Save size={16} />
                    {isSaving ? 'Syncing to services...' : 'Save & Sync to OpenHands/n8n'}
                </button>
            </div>
        </div>
    );
};

export const RemoteSettings: React.FC = () => {
    const [enabled, setEnabled] = useConfig('remote.enabled', false);
    const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    // Auth State
    const [authStatus, setAuthStatus] = useState<{ configured: boolean; totpEnabled: boolean }>({ configured: false, totpEnabled: false });
    const [showTotpSetup, setShowTotpSetup] = useState(false);
    const [totpSecret, setTotpSecret] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
    const [verifyToken, setVerifyToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');

    useEffect(() => {
        loadAuthStatus();
        if (enabled && status === 'idle') {
            toggleTunnel(true);
        }
    }, [enabled]);

    const loadAuthStatus = async () => {
        // @ts-expect-error
        if (window.ipcRenderer) {
            // @ts-expect-error
            const status = await window.ipcRenderer.invoke('auth-status');
            setAuthStatus(status);
        }
    };

    const toggleTunnel = async (forceState?: boolean) => {
        const newState = forceState !== undefined ? forceState : !enabled;
        if (newState) {
            setStatus('starting');
            setError(null);
            try {
                // @ts-expect-error
                if (window.ipcRenderer) {
                    // @ts-expect-error
                    const result = await window.ipcRenderer.invoke('remote-start');
                    if (result.success) {
                        setTunnelUrl(result.url);
                        setStatus('running');
                        setEnabled(true);
                    } else {
                        throw new Error(result.error);
                    }
                } else {
                    // Sim
                    setTimeout(() => {
                        setTunnelUrl('https://demo-agent-manager.trycloudflare.com');
                        setStatus('running');
                        setEnabled(true);
                    }, 1000);
                }
            } catch (e: any) {
                setError(e.message);
                setStatus('error');
                setEnabled(false);
            }
        } else {
            try {
                // @ts-expect-error
                if (window.ipcRenderer) {
                    // @ts-expect-error
                    await window.ipcRenderer.invoke('remote-stop');
                }
            } catch (e) { }
            setTunnelUrl(null);
            setStatus('idle');
            setEnabled(false);
        }
    };

    const startTotpSetup = async () => {
        // @ts-expect-error
        if (window.ipcRenderer) {
            // @ts-expect-error
            const result = await window.ipcRenderer.invoke('auth-setup-totp');
            setTotpSecret(result);
            setShowTotpSetup(true);
        }
    };

    const confirmTotp = async () => {
        if (!totpSecret) return;
        // @ts-expect-error
        if (window.ipcRenderer) {
            // @ts-expect-error
            const verify = await window.ipcRenderer.invoke('auth-verify-totp', verifyToken);
            if (verify) {
                // @ts-expect-error
                await window.ipcRenderer.invoke('auth-enable-totp', verifyToken, totpSecret.secret);
                setShowTotpSetup(false);
                setVerifyToken('');
                loadAuthStatus();
                alert('2FA Enabled Successfully!');
            } else {
                alert('Invalid Code. Please try again.');
            }
        }
    };

    const disableTotp = async () => {
        if (confirm('Disable 2FA? This will reduce security.')) {
            // @ts-expect-error
            if (window.ipcRenderer) {
                // @ts-expect-error
                await window.ipcRenderer.invoke('auth-disable-totp');
                loadAuthStatus();
            }
        }
    };

    const savePassword = async () => {
        if (newPassword.length < 8) {
            setPasswordMessage('Password must be at least 8 characters');
            return;
        }
        // @ts-expect-error
        if (window.ipcRenderer) {
            // @ts-expect-error
            await window.ipcRenderer.invoke('auth-set-password', newPassword);
            setNewPassword('');
            setPasswordMessage('Password updated successfully');
            loadAuthStatus();
            setTimeout(() => setPasswordMessage(''), 3000);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Cloudflare Tunnel Section */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Server size={20} className="text-blue-400" />
                    Cloudflare Tunnel
                </h3>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="text-white font-medium">Enable Remote Access</div>
                        <div className="text-sm text-gray-400">Expose dashboard securely to the internet</div>
                    </div>
                    <button
                        onClick={() => toggleTunnel()}
                        disabled={status === 'starting'}
                        className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-green-500' : 'bg-gray-600'} ${status === 'starting' ? 'opacity-50' : ''}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded-lg text-sm">
                        Error: {error}
                    </div>
                )}

                {enabled && (status === 'starting' || status === 'running') && (
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                        <div className="text-xs text-gray-500 uppercase mb-1">Public URL</div>
                        <div className="flex items-center justify-between">
                            <code className="text-green-400">
                                {status === 'starting' ? 'Starting tunnel...' : tunnelUrl}
                            </code>
                            {tunnelUrl && (
                                <button
                                    onClick={() => navigator.clipboard.writeText(tunnelUrl)}
                                    className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                    Copy
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Security Section */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Key size={20} className="text-yellow-400" />
                    Security & Authentication
                </h3>

                <div className="space-y-6">
                    {/* Password Setup */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Access Password</label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={authStatus.configured ? "Change password..." : "Set a secure password"}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                            />
                            <button
                                onClick={savePassword}
                                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm"
                            >
                                Set
                            </button>
                        </div>
                        {passwordMessage && <p className="text-xs text-green-400 mt-1">{passwordMessage}</p>}
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-white font-medium">Two-Factor Authentication (2FA)</div>
                                <div className="text-sm text-gray-400">Protect remote access with TOTP</div>
                            </div>
                            {authStatus.totpEnabled ? (
                                <button
                                    onClick={disableTotp}
                                    className="px-3 py-1 bg-red-900/30 text-red-400 border border-red-800 rounded text-sm hover:bg-red-900/50"
                                >
                                    Disable
                                </button>
                            ) : (
                                <button
                                    onClick={startTotpSetup}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
                                >
                                    Enable
                                </button>
                            )}
                        </div>

                        {showTotpSetup && totpSecret && (
                            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 flex flex-col items-center gap-4">
                                <h4 className="text-white text-sm font-medium">Scan QR Code with Authenticator App</h4>
                                <img src={totpSecret.qrCodeUrl} alt="QR Code" className="w-48 h-48 bg-white p-2 rounded" />
                                <div className="w-full max-w-xs">
                                    <label className="block text-xs text-gray-500 mb-1">Enter Verification Code</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={verifyToken}
                                            onChange={(e) => setVerifyToken(e.target.value)}
                                            placeholder="123456"
                                            className="flex-1 bg-gray-800 border border-gray-600 rounded p-2 text-center text-white text-lg tracking-widest"
                                            maxLength={6}
                                        />
                                        <button
                                            onClick={confirmTotp}
                                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
                                        >
                                            Verify
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTotpSetup(false)}
                                    className="text-xs text-gray-500 hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const KnowledgeSettings: React.FC = () => {
    const [apiKey, setApiKey] = useConfig('dify.apiKey', '');
    const [baseUrl, setBaseUrl] = useConfig('dify.baseUrl', 'http://localhost/v1');

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">🧠</span>
                    Dify Knowledge Configuration
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Dify API Base URL</label>
                        <input
                            type="text"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="http://localhost/v1"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">Found in Dify Settings &gt; API Extensions</p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Dataset API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="dataset-..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">Create this key in Dify &gt; Knowledge &gt; Settings &gt; API</p>
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg text-white hover:bg-purple-500">
                    <Save size={16} /> Save Changes
                </button>
            </div>
        </div>
    );
};

export const GeneralSettings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [theme, setTheme] = useConfig('app.theme', 'dark');
    const [language, setLanguage] = useConfig('app.llm_language', 'en');

    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
        i18n.changeLanguage(newLang); // Update UI language immediately
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">{t('settings.general.appearance')}</h3>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('settings.general.theme')}</label>
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                    >
                        <option value="dark">{t('settings.general.darkMode')}</option>
                        <option value="light">{t('settings.general.lightMode')}</option>
                    </select>
                </div>

                <div className="mt-4">
                    <label className="block text-sm text-gray-400 mb-1">{t('settings.general.responseLanguage')}</label>
                    <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                    >
                        <option value="en">English</option>
                        <option value="ja">日本語 (Japanese)</option>
                        <option value="es">Español (Spanish)</option>
                        <option value="zh">中文 (Chinese)</option>
                        <option value="ko">한국어 (Korean)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">{t('settings.general.languageHint')}</p>
                </div>
            </div>
        </div>
    );
};
