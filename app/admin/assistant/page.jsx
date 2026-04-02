'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { RotateCcw, Save } from 'lucide-react';

export default function AdminAssistantPage() {
    const { getToken } = useAuth();
    const [systemPrompt, setSystemPrompt] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);

    const fetchConfig = async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get('/api/admin/assistant-config', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSystemPrompt(data.systemPrompt ?? '');
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to load config');
        } finally {
            setLoading(false);
        }
    };

    const fetchDefault = async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get('/api/admin/assistant-config?default=1', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSystemPrompt(data.systemPrompt ?? '');
            toast.success('Reset to default prompt');
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to load default');
        } finally {
            setResetting(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = await getToken();
            await axios.post(
                '/api/admin/assistant-config',
                { systemPrompt },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Saved. Ask AI will use this prompt.');
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[320px]">
                <div className="text-zinc-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">AI <span className="text-emerald-400">Assistant</span></h1>
            <p className="text-sm text-zinc-500 mb-8">Shape how the assistant thinks and responds. Context (store type, categories, products) is injected automatically.</p>

            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">System prompt (thought process & rules)</label>
                    <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="Define intents (INTENT:normal, INTENT:buying, ...) and rules. The model must end each reply with one INTENT line."
                        rows={22}
                        className="w-full px-4 py-3 rounded-lg bg-zinc-900/80 border border-zinc-700/60 text-zinc-200 placeholder-zinc-600 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 resize-y min-h-[320px]"
                        spellCheck={false}
                    />
                    <p className="mt-1.5 text-xs text-zinc-600">
                        {systemPrompt.length} characters · Use INTENT:... on a new line after the reply so links show correctly.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setResetting(true);
                            fetchDefault();
                        }}
                        disabled={resetting}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 font-medium text-sm transition disabled:opacity-50"
                    >
                        <RotateCcw className="w-4 h-4" />
                        {resetting ? 'Loading...' : 'Reset to default'}
                    </button>
                </div>
            </form>
        </div>
    );
}
